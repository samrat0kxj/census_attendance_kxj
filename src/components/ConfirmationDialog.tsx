import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  severity?: "danger" | "warning" | "info";
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  severity = "danger"
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const colorMap = {
    danger: {
      icon: "text-red-400 bg-red-950/30 border border-red-900/40",
      btn: "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20"
    },
    warning: {
      icon: "text-amber-400 bg-amber-950/30 border border-amber-900/40",
      btn: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20"
    },
    info: {
      icon: "text-indigo-400 bg-indigo-950/30 border border-indigo-900/40",
      btn: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/20"
    }
  };

  const style = colorMap[severity];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#111114] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 animate-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#1A1A1F] border-b border-slate-800">
          <h3 className="font-display font-semibold text-white text-base">{title}</h3>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex gap-4">
          <div className={`p-3 rounded-xl h-fit shrink-0 ${style.icon}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#1A1A1F] border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#1A1A1F] hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-xl border border-slate-800 transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-lg transition-all cursor-pointer ${style.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
