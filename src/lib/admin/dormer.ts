import {
  collection,
  addDoc,
  doc,
  setDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  Transaction,
  getDocs,
  writeBatch,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { firestore as db, auth, firebaseConfig } from "@/lib/firebase";
import { Bill, DormerData } from "../../app/admin/dormers/types";
import { generateRandomPassword } from "@/app/admin/dormers/utils/generateRandomPass";
import { toast } from "sonner";
import { welcomeUserTemplate } from "@/app/admin/dormers/email-templates/welcomeUser";
import { initializeApp } from "firebase/app";

export const checkUserPassword = async (email: string, password: string) => {
  try {
    const user = getAuth().currentUser;
    if (!user) throw new Error("User not found");
    return await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password)).then(() => {
      return true;
    }).catch(() => {
      return false;
    });
  } catch (error) {
    return false;
  }
}

export const createAdminDormer = async (
  dormerData: DormerData,
  currentAdmin: User,
  adminEmail: string,
  adminPassword: string,
  temporaryPassword: string,
  dormitoryId: string
) => {
  try {
    
  const newAdminUid = await createAccountWithoutLoggingOut(dormerData.email, temporaryPassword);
  if (!await checkUserPassword(adminEmail, adminPassword)) {
    throw new Error("Invalid admin password");
  }
  await setDoc(doc(db, "dormers", newAdminUid), {
    ...dormerData,
    dormitoryId,
    dormerId: newAdminUid,
    createdAt: serverTimestamp(),
    createdBy: currentAdmin.uid,
  });

  return newAdminUid;
  } catch (error) {
    toast.error("Error creating admin dormer:", error)
  }
};

export const updateDormerDetails = async (dormerId: string, dormerData: DormerData, user: User) => {
  const dormerRef = doc(db, "dormers", dormerId);
  await updateDoc(dormerRef, {
    ...dormerData,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}

export const fetchDormitoryIdByUid = async (uid: string): Promise<string | null> => {
  try {
    const userDocRef = doc(db, "dormers", uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      return userDocSnap.data()?.dormitoryId || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching dormitory ID:", error);
    return null;
  }
};

export const createAccountWithoutLoggingOut = async (email: string, password: string) => {
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth)
    return userCredential.user.uid;
  } catch (error) {
    throw error;
  }
}

export const createUserDormer = async (
  dormerData: DormerData,
  currentAdmin: User,
  temporaryPassword: string,
  dormitoryId: string
) => {
  const userCredential = await createAccountWithoutLoggingOut(dormerData.email, temporaryPassword);
  const newUserUid = userCredential;


  dormerData.id = newUserUid;

  await setDoc(doc(db, "dormers", newUserUid), {
    ...dormerData,
    dormitoryId,
    dormerId: newUserUid,
    createdAt: serverTimestamp(),
    createdBy: currentAdmin.uid,
  });
  return newUserUid;
};

export const recordPaymentTransaction = async (
  paymentData: any,
  user: User,
  dormitoryId: string
) => {
  const billRef = doc(db, "bills", paymentData.billId);

  return runTransaction(db, async (transaction: Transaction) => {
    const billDoc = await transaction.get(billRef);
    if (!billDoc.exists()) {
      throw new Error("Bill document does not exist!");
    }

    const currentBillData = billDoc.data();
    const totalAmountDue = currentBillData.totalAmountDue;
    const amountAlreadyPaid = currentBillData.amountPaid || 0;
    const newTotalPaid = amountAlreadyPaid + paymentData.amount;
    const finalAmountPaidForBill = Math.min(newTotalPaid, totalAmountDue);

    let newStatus: Bill["status"] = "Unpaid";
    if (finalAmountPaidForBill >= totalAmountDue) {
      newStatus = "Paid";
    } else if (finalAmountPaidForBill > 0) {
      newStatus = "Partially Paid";
    }

    const paymentRef = doc(collection(db, "payments"));
    transaction.set(paymentRef, {
      ...paymentData,
      dormitoryId,
      recordedBy: user.uid,
      recordedByName: paymentData.recordedByName || user.displayName || user.email || user.uid,
      createdAt: serverTimestamp(),
    });

    transaction.update(billRef, {
      amountPaid: finalAmountPaidForBill,
      dormitoryId,
      status: newStatus,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });

    return { newStatus, finalAmountPaidForBill };
  });
};

export const softDeleteDormer = async (dormerId: string) => {
  if (!dormerId) throw new Error("Dormer ID is required for deletion.");

  const dormerRef = doc(db, "dormers", dormerId);
  await updateDoc(dormerRef, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
  });

  const billsRef = collection(db, "bills");
  const eventPaymentsRef = collection(db, "eventPayments");

  const billsQuery = query(billsRef, where("dormerId", "==", dormerId), where("status", "==", "Unpaid"));
  const eventPaymentsQuery = query(
    eventPaymentsRef,
    where("dormerId", "==", dormerId),
    where("status", "==", "Unpaid")
  );

  const billsSnapshot = await getDocs(billsQuery);
  const eventPaymentsSnapshot = await getDocs(eventPaymentsQuery);

  const batch = writeBatch(db);

  billsSnapshot.forEach((bill) => {
    batch.set(bill.ref, { isDeleted: true, deletedAt: serverTimestamp() });
  });


  eventPaymentsSnapshot.forEach((eventPayment) => {
    batch.set(
      eventPayment.ref,
      { isDeleted: true, deletedAt: serverTimestamp() }
    );
  });

  await batch.commit();
};

const sendEmail = async (emailData: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }

    await response.json();
  } catch (error) {
    toast.error("Failed to send notification email.");
  }
};

const downloadLogFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
/**
 * =============================================================================
 * !! DANGER !! HIGHLY DESTRUCTIVE SCRIPT !!
 * =============================================================================
 *
 * This function migrates existing Firestore-only dormers to Firebase Auth.
 * It is NOT IDEMPOTENT. Running it more than once without safeguards can
 * corrupt your data.
 *
 * MAKE A FULL BACKUP OF YOUR FIRESTORE DATABASE BEFORE RUNNING THIS.
 *
 * This function will:
 * 1. Find all dormers with role: "User"
 * 2. For each, create a new Firebase Auth user with a random password.
 * 3. Create a NEW dormer document using the Auth UID as the document ID.
 * 4. Find all related 'bills', 'payments', and 'eventPayments' pointing to
 * the OLD dormer ID.
 * 5. Update them to point to the NEW Auth UID.
 * 6. Delete the OLD dormer document.
 *
 * This is done in a batch per-user. If a user's auth creation fails
 * (e.g., duplicate email), it will skip that user and continue.
 * If a Firestore batch fails, it will stop and log the error,
 * leaving a newly created Auth user without a matching Firestore record.
 *
 * =============================================================================
 */
export const migrateDormerAccounts = async () => {
  const logEntries: string[] = [];
  const log = (message: string) => {
    logEntries.push(`[${new Date().toISOString()}] ${message}`);
  };

  log("Starting dormer migration...");
  toast.info("Starting dormer migration... This may take a while.");

  const userQuery = query(
    collection(db, "dormers"),
    where("role", "==", "User")
  );

  const snapshot = await getDocs(userQuery);

  if (snapshot.empty) {
    log("No dormers found to migrate.");
    toast.success("No dormers found to migrate.");
    return;
  }

  log(`Found ${snapshot.docs.length} dormer(s) to migrate.`);
  let successCount = 0;
  let errorCount = 0;

  // 2. Process each dormer one-by-one for safety
  for (const docSnap of snapshot.docs) {
    const oldDormerId = docSnap.id;
    const dormerData = docSnap.data();
    const email = dormerData.email;

    if (!email) {
      log(`[ERROR] Skipping dormer with ID ${oldDormerId}: No email.`);
      errorCount++;
      continue;
    }

    let newAuthUid: string;

    // 3. Create Auth User
    try {
      const newPassword = generateRandomPassword();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        newPassword
      );
      newAuthUid = userCredential.user.uid;
      log(`[SUCCESS] Created Auth user for ${email} with UID: ${newAuthUid}`);

      await sendEmail({
        to: dormerData.email,
        subject: "Welcome to DormPay System",
        html: welcomeUserTemplate(
          dormerData.firstName,
          dormerData.email,
          newPassword
        ),
      });

      log(`  > Welcome email sent to ${email}.`);
      log(`  > TEMPORARY PASSWORD for ${email}: ${newPassword}`);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        log(
          `[WARN] Auth user for ${email} already exists. Skipping auth creation.`
        );
        toast.warning(`Dormer ${email} already has an auth account.`, {
          description: "Skipping migration for this user.",
        });
      } else {
        log(
          `[ERROR] Failed to create auth user for ${email}: ${error.message}`
        );
        toast.error(`Failed to create auth user for ${email}.`, {
          description: error.message,
        });
      }
      errorCount++;
      continue;
    }

    // 4. Perform Firestore data migration in a single batch
    const batch = writeBatch(db);
    try {
      // Step 4.1: Create NEW dormer doc with new UID
      const newDormerRef = doc(db, "dormers", newAuthUid);
      batch.set(newDormerRef, {
        ...dormerData,
        dormerId: newAuthUid,
        uid: newAuthUid,
      });
      log(`  > Batch: SET new dormer doc ${newAuthUid}`);

      // Step 4.2: Find and update 'bills'
      const billsQuery = query(
        collection(db, "bills"),
        where("dormerId", "==", oldDormerId)
      );

      const billsSnapshot = await getDocs(billsQuery);
      billsSnapshot.forEach((billDoc) => {
        batch.update(billDoc.ref, { dormerId: newAuthUid });
      });
      log(
        `  > Batch: UPDATE ${billsSnapshot.size} bill(s) from ${oldDormerId} to ${newAuthUid}.`
      );

      // Step 4.3: Find and update 'payments'
      const paymentsQuery = query(
        collection(db, "payments"),
        where("dormerId", "==", oldDormerId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach((paymentDoc) => {
        batch.update(paymentDoc.ref, { dormerId: newAuthUid });
      });
      log(
        `  > Batch: UPDATE ${paymentsSnapshot.size} payment(s) from ${oldDormerId} to ${newAuthUid}.`
      );

      // Step 4.4: Find and update 'eventPayments'
      const eventPaymentsQuery = query(
        collection(db, "eventPayments"),
        where("dormerId", "==", oldDormerId)
      );
      const eventPaymentsSnapshot = await getDocs(eventPaymentsQuery);
      eventPaymentsSnapshot.forEach((eventPaymentDoc) => {
        batch.update(eventPaymentDoc.ref, { dormerId: newAuthUid });
      });
      log(
        `  > Batch: UPDATE ${eventPaymentsSnapshot.size} event payment(s) from ${oldDormerId} to ${newAuthUid}.`
      );

      // Step 4.5: Delete OLD dormer doc
      const oldDormerRef = doc(db, "dormers", oldDormerId);
      batch.delete(oldDormerRef);
      log(`  > Batch: DELETE old dormer doc ${oldDormerId}.`);
      // Step 4.6: Commit all changes
      await batch.commit();

      log(`[SUCCESS] Successfully migrated ${email}.`);
      successCount++;
    } catch (error: any) {
      log(
        `[CRITICAL ERROR] Failed to commit Firestore batch for ${email} (Auth UID: ${newAuthUid}).`
      );
      log(`  > Error: ${error.message}`);
      log(
        "  > DATA IS NOW INCONSISTENT. An auth user was created but Firestore migration failed."
      );
      toast.error(`CRITICAL: Firestore migration failed for ${email}.`, {
        description:
          "An auth user was created, but data was not migrated. Manual cleanup required.",
      });
      errorCount++;
    }
  }

  log("--- MIGRATION COMPLETE ---");
  log(`Success: ${successCount}`);
  log(`Failed: ${errorCount}`);
  toast.success("Dormer migration complete!", {
    description: `Success: ${successCount}, Failed: ${errorCount}. Log file downloading.`,
  });
  const logContent = logEntries.join("\n");
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  downloadLogFile(logContent, `dormer-migration-log-${timestamp}.txt`);
};

// export const updateDormerId = async () => {
//   try {
//     // 1. Get a reference to the collection
//     const dormersCollection = collection(db, "dormers");
    
//     // 2. Fetch all documents in the collection
//     const querySnapshot = await getDocs(dormersCollection);
    
//     // 3. Initialize a WriteBatch
//     const batch = writeBatch(db);
//     let count = 0;

//     // 4. Loop through each document and add the update to the batch
//     querySnapshot.forEach((document) => {
//       const docRef = doc(db, "dormers", document.id);
      
//       batch.update(docRef, {
//         dormitoryId: "9yHHtMPd2dalQ5f25Y7m",
//         isDeleted: false,
//       });
      
//       count++;
//     });

//     // 5. Commit the batch (sends all updates in one network request)
//     if (count > 0) {
//       await batch.commit();
//       console.log(`Successfully updated ${count} dormers.`);
//     } else {
//       console.log("No dormers found to update.");
//     }
    
//   } catch (error) {
//     console.error("Error updating dormers:", error);
//   }
// };

// export const updateIds = async () => {
//   const billsCollection = collection(db, "bills");
//   const paymentsCollection = collection(db, "payments");
//   const eventPaymentsCollection = collection(db, "eventPayments");
//   const eventsCollection = collection(db, "events");
//   const regularChargeCollection = collection(db, "regularCharge");
//   const expensesCollection = collection(db, "expenses");

//   const batch = writeBatch(db);
//   let count = 0;

//   const billsQuery = query(billsCollection);
//   const paymentsQuery = query(paymentsCollection);
//   const eventPaymentsQuery = query(eventPaymentsCollection);
//   const eventsQuery = query(eventsCollection);
//   const regularChargeQuery = query(regularChargeCollection);
//   const expensesQuery = query(expensesCollection);

//   const billsSnapshot = await getDocs(billsQuery);
//   const paymentsSnapshot = await getDocs(paymentsQuery);
//   const eventPaymentsSnapshot = await getDocs(eventPaymentsQuery);
//   const eventsSnapshot = await getDocs(eventsQuery);
//   const regularChargeSnapshot = await getDocs(regularChargeQuery);
//   const expensesSnapshot = await getDocs(expensesQuery);

//   billsSnapshot.forEach((billDoc) => {
//     const billRef = doc(db, "bills", billDoc.id);
//     batch.update(billRef, {
//       dormitoryId: "9yHHtMPd2dalQ5f25Y7m",
//       isDeleted: false,
//     });
//     count++;
//   });

//   paymentsSnapshot.forEach((paymentDoc) => {
//     const paymentRef = doc(db, "payments", paymentDoc.id);
//     batch.update(paymentRef, {
//       dormitoryId: "9yHHtMPd2dalQ5f25Y7m",
//       isDeleted: false,
//     });
//     count++;
//   });

//   eventPaymentsSnapshot.forEach((eventPaymentDoc) => {
//     const eventPaymentRef = doc(db, "eventPayments", eventPaymentDoc.id);
//     batch.update(eventPaymentRef, {
//       dormitoryId: "9yHHtMPd2dalQ5f25Y7m",
//       isDeleted: false,
//     });
//     count++;
//   });

//   eventsSnapshot.forEach((eventDoc) => {
//     const eventRef = doc(db, "events", eventDoc.id);
//     batch.update(eventRef, {
//       dormitoryId: "9yHHtMPd2dalQ5f25Y7m",
//       isDeleted: false,
//     });
//     count++;
//   });

//   regularChargeSnapshot.forEach((regularChargeDoc) => {
//     const regularChargeRef = doc(db, "regularCharge", regularChargeDoc.id);
//     batch.update(regularChargeRef, {
//       dormitoryId: "9yHHtMPd2dalQ5f25Y7m",
//       isDeleted: false,
//     });
//     count++;
//   });

//   expensesSnapshot.forEach((expenseDoc) => {
//     const expenseRef = doc(db, "expenses", expenseDoc.id);
//     batch.update(expenseRef, {
//       dormitoryId: "9yHHtMPd2dalQ5f25Y7m",
//       isDeleted: false,
//     });
//     count++;
//   });

//   if (count > 0) {
//     await batch.commit();
//     console.log(`Successfully updated ${count} documents.`);
//   } else {
//     console.log("No documents found to update.");
//   } 
// }