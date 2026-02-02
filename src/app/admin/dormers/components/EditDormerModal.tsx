"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DormerData } from "../types";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { MaboloRoomNumber, SampaguitaRoomNumber } from "@/app/constants/roomNumber";

// --- Type Definitions ---
interface EditDormerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (dormerData: DormerData) => void;
  dormerData: DormerData
}

// --- Component ---
export default function EditDormerModal({
  isOpen,
  onClose,
  onUpdate,
  dormerData,
}: EditDormerModalProps) {
    if(dormerData === null) {
        return null;
    }
  const [firstName, setFirstName] = useState(dormerData.firstName);
  const [lastName, setLastName] = useState(dormerData.lastName);
  const [email, setEmail] = useState(dormerData.email);
  const [phone, setPhone] = useState(dormerData.phone);
  const [role, setRole] = useState(dormerData.role);
  const [roomNumber, setRoomNumber] = useState(dormerData.roomNumber);

  const handleSave = () => {
    if (!firstName || !lastName || !email || !phone || !role || !roomNumber) {
      toast.info("All fields are required.");
      return;
    }
    const dormerDetails: DormerData = {
      firstName,
      lastName,
      email,
      phone,
      role,
      roomNumber,
      id: dormerData.dormerId,
      dormerId: dormerData.dormerId,
    };
    onUpdate(dormerDetails);
    handleClose();
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRole("");
    setRoomNumber("");
    onClose();
  };

  const {dormitoryName} = useCurrentDormitoryId();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>Edit Dormer</DialogTitle>
          <DialogDescription className={undefined}>
            Fill in the details to edit a dormitory resident
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className={undefined}>
                First Name <span className="text-xs text-gray-500">({firstName.length}/50)</span>
              </Label>
              <Input
                id="firstName"
                className="mt-1"
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFirstName(e.target.value)
                }
                maxLength={50}
                type={undefined}
              />
            </div>
            <div>
              <Label htmlFor="lastName" className={undefined}>
                Last Name <span className="text-xs text-gray-500">({lastName.length}/50)</span>
              </Label>
              <Input
                id="lastName"
                className="mt-1"
                value={lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLastName(e.target.value)
                }
                maxLength={50}
                type={undefined}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className={undefined}>
                Email <span className="text-xs text-gray-500">({email.length}/100)</span>
              </Label>
              <Input
                id="email"
                type="email"
                className="mt-1"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="phone" className={undefined}>
                Phone <span className="text-xs text-gray-500">({phone.length}/20)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                className="mt-1"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPhone(e.target.value)
                }
                maxLength={20}
              />
            </div>
          </div>

          <Separator className={undefined} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <Label htmlFor="role" className={undefined}>
              Role
            </Label>
            <Select value={role} onValueChange={setRole} disabled={true}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                <SelectItem value="Admin" className={undefined}>
                  Admin
                </SelectItem>
                <SelectItem value="User" className={undefined}>
                  User
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <Label htmlFor="roomNumber" className={undefined}>
              Room Number
            </Label>
            <Select value={roomNumber} onValueChange={setRoomNumber}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                {dormitoryName === "Mabolo Mens Home" ? (
                  MaboloRoomNumber.map((room) => (
                    <SelectItem key={room} className={undefined} value={room}>
                      {room}
                    </SelectItem>
                  ))
                ): (SampaguitaRoomNumber.map((room) => (
                  <SelectItem key={room} className={undefined} value={room}>
                    {room}
                  </SelectItem>
                )))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className={undefined}>
          <Button
            variant="outline"
            onClick={handleClose}
            className={undefined}
            size={undefined}
          >
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSave}
            variant="default"
            size="default"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
