import { useState } from "react";
import { Dormer, ModalType } from "../../dormers/types";
import { PaymentFines, PaymentFinesData } from "../types";

export function useModal() {
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedDormer, setSelectedDormer] = useState<Dormer | null>(null);
  const [selectedFinePayment, setSelectedFinePayment] = useState<PaymentFinesData | null>(null);

  const openModal = (
    modalType: ModalType,
    dormer: Dormer | null = null,
    finePayment: PaymentFinesData | null = null
  ) => {
    setModal(modalType);
    setSelectedDormer(dormer);
    setSelectedFinePayment(finePayment);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedDormer(null);
    setSelectedFinePayment(null);
  };

  return {
    modal,
    selectedDormer,
    selectedFinePayment,
    openModal,
    closeModal,
  };
}
