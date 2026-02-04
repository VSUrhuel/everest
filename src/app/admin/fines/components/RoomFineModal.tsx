"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Users } from "lucide-react";
import { Dormer } from "../../dormers/types";

interface RoomFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (roomNumber: string, amount: number, reason: string, dateImposed: Date) => Promise<void>;
  dormers: Dormer[];
  isSubmitting: boolean;
}

export default function RoomFineModal({
  isOpen,
  onClose,
  onApply,
  dormers,
  isSubmitting,
}: RoomFineModalProps) {
  const [roomNumber, setRoomNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [dateImposed, setDateImposed] = useState(new Date().toISOString().split('T')[0]);
  const [roomDormers, setRoomDormers] = useState<Dormer[]>([]);

  // Get unique room numbers from dormers
  const availableRooms = Array.from(
    new Set(dormers.map(d => d.roomNumber).filter(room => room))
  ).sort();

  useEffect(() => {
    if (roomNumber) {
      const dormersInRoom = dormers.filter(d => d.roomNumber === roomNumber);
      setRoomDormers(dormersInRoom);
    } else {
      setRoomDormers([]);
    }
  }, [roomNumber, dormers]);

  const handleSubmit = async () => {
    if (!roomNumber || !amount || !reason || !dateImposed) {
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    await onApply(roomNumber, numAmount, reason, new Date(dateImposed));
    handleClose();
  };

  const handleClose = () => {
    setRoomNumber("");
    setAmount("");
    setReason("");
    setDateImposed(new Date().toISOString().split('T')[0]);
    setRoomDormers([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>Apply Fine to Room</DialogTitle>
          <DialogDescription className={undefined}>
            Apply a shared fine to all residents in a specific room. Each resident will see the fine individually, but when any one resident pays it, the fine is automatically cleared for all others in the room.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room" className={undefined}>Room Number *</Label>
            <Select 
              value={roomNumber}
              onValueChange={setRoomNumber}
              disabled={isSubmitting}
            >
              <SelectTrigger className={undefined}>
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent className={undefined}>
                {availableRooms.map((room) => (
                  <SelectItem key={`room-${room}`} value={String(room)} className={undefined}>
                    Room {room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {roomDormers.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    {roomDormers.length} {roomDormers.length === 1 ? 'Resident' : 'Residents'} in Room {roomNumber}
                  </p>
                  <div className="space-y-1">
                    {roomDormers.map((dormer) => (
                      <p key={dormer.id} className="text-xs text-blue-800">
                        • {dormer.firstName} {dormer.lastName} ({dormer.email})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount" className={undefined}>Fine Amount (₱) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              step="0.01"
              min="0"
              className={undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateImposed" className={undefined}>Date Imposed *</Label>
            <Input
              id="dateImposed"
              type="date"
              value={dateImposed}
              onChange={(e) => setDateImposed(e.target.value)}
              disabled={isSubmitting}
              max={new Date().toISOString().split('T')[0]}
              className={undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className={undefined}>Fine Reason / Remarks *</Label>
            <Textarea
              id="reason"
              placeholder="E.g., Room violation, hanging fines, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[100px]"
            />
          </div>

          {roomDormers.length > 0 && amount && reason && (
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Shared Room Fine</p>
                  <p className="text-xs">
                    You are about to generate <strong>{roomDormers.length} linked fines</strong> of <strong>₱{parseFloat(amount).toFixed(2)}</strong> each for Room {roomNumber}. 
                    <br/>When <strong>any one resident pays</strong> the fine, it will be automatically cleared for all other residents in the room.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className={undefined}>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className={undefined}
            size={undefined}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleSubmit}
            disabled={!roomNumber || !amount || !reason || !dateImposed || isSubmitting || roomDormers.length === 0}
            variant={undefined}
            size={undefined}
          >
            {isSubmitting ? "Applying Fine..." : `Apply Fine to ${roomDormers.length || 0} ${roomDormers.length === 1 ? 'Resident' : 'Residents'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
