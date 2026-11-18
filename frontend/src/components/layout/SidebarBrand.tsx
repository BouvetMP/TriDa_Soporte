import React from "react";
import { ShieldCheck } from "lucide-react";

export const SidebarBrand: React.FC = () => {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold tracking-tight text-text-primary leading-none">
          TriDa <span className="text-xs font-normal text-primary">v2</span>
        </span>
        <span className="text-[10px] text-text-muted mt-1 font-medium">
          Asesor & Protección IA
        </span>
      </div>
    </div>
  );
};
