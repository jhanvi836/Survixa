// Ambient type declarations to ensure zero TypeScript errors in IDE
// whether dependencies are being loaded or before initial npm install

declare module "@prisma/client" {
  export type AgencyType = 
    | "FIRE" 
    | "MEDICAL" 
    | "POLICE" 
    | "NGO" 
    | "COAST_GUARD" 
    | "CIVIL_DEFENSE" 
    | "DISASTER_MANAGEMENT";

  export const AgencyType: {
    FIRE: "FIRE";
    MEDICAL: "MEDICAL";
    POLICE: "POLICE";
    NGO: "NGO";
    COAST_GUARD: "COAST_GUARD";
    CIVIL_DEFENSE: "CIVIL_DEFENSE";
    DISASTER_MANAGEMENT: "DISASTER_MANAGEMENT";
  };

  export type IncidentStatus = 
    | "RECEIVED" 
    | "VERIFIED" 
    | "ASSIGNED" 
    | "EN_ROUTE" 
    | "RESOLVED";

  export const IncidentStatus: {
    RECEIVED: "RECEIVED";
    VERIFIED: "VERIFIED";
    ASSIGNED: "ASSIGNED";
    EN_ROUTE: "EN_ROUTE";
    RESOLVED: "RESOLVED";
  };

  export type IncidentCategory = 
    | "FIRE" 
    | "FLOOD" 
    | "EARTHQUAKE" 
    | "MEDICAL_EMERGENCY" 
    | "STRUCTURAL_COLLAPSE" 
    | "HAZMAT" 
    | "SEARCH_AND_RESCUE" 
    | "CYCLONE_STORM" 
    | "OTHER";

  export const IncidentCategory: {
    FIRE: "FIRE";
    FLOOD: "FLOOD";
    EARTHQUAKE: "EARTHQUAKE";
    MEDICAL_EMERGENCY: "MEDICAL_EMERGENCY";
    STRUCTURAL_COLLAPSE: "STRUCTURAL_COLLAPSE";
    HAZMAT: "HAZMAT";
    SEARCH_AND_RESCUE: "SEARCH_AND_RESCUE";
    CYCLONE_STORM: "CYCLONE_STORM";
    OTHER: "OTHER";
  };

  export type UnitStatus = 
    | "AVAILABLE" 
    | "DISPATCHED" 
    | "ON_SCENE" 
    | "RETURNING" 
    | "STANDBY" 
    | "OFFLINE";

  export const UnitStatus: {
    AVAILABLE: "AVAILABLE";
    DISPATCHED: "DISPATCHED";
    ON_SCENE: "ON_SCENE";
    RETURNING: "RETURNING";
    STANDBY: "STANDBY";
    OFFLINE: "OFFLINE";
  };

  export type UserRole = "CITIZEN" | "COMMANDER" | "DISPATCHER" | "ADMIN";

  export const UserRole: {
    CITIZEN: "CITIZEN";
    COMMANDER: "COMMANDER";
    DISPATCHER: "DISPATCHER";
    ADMIN: "ADMIN";
  };

  export type UpdateVisibility = "PUBLIC" | "INTERNAL_CONFIDENTIAL";

  export const UpdateVisibility: {
    PUBLIC: "PUBLIC";
    INTERNAL_CONFIDENTIAL: "INTERNAL_CONFIDENTIAL";
  };

  export class PrismaClient {
    constructor(options?: any);
    incident: any;
    rescueUnit: any;
    unitDispatch: any;
    statusUpdateLog: any;
    user: any;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
}

declare module "lucide-react" {
  import * as React from "react";
  export type LucideIcon = React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string; className?: string }>;
  export const AlertTriangle: LucideIcon;
  export const Shield: LucideIcon;
  export const Radio: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Compass: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Search: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const MapPin: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Send: LucideIcon;
  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;
  export const Globe: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Clock: LucideIcon;
  export const Truck: LucideIcon;
  export const Layers: LucideIcon;
  export const X: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Copy: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const Flame: LucideIcon;
  export const HeartPulse: LucideIcon;
  export const Users: LucideIcon;
  export const Navigation: LucideIcon;
  export const Activity: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const LifeBuoy: LucideIcon;
  export const HeartHandshake: LucideIcon;
  export const Ambulance: LucideIcon;
  export const Waves: LucideIcon;
  export const Building: LucideIcon;
  export const Camera: LucideIcon;
  export const WifiOff: LucideIcon;
  export const Wifi: LucideIcon;
  export const Sliders: LucideIcon;
  export const Trash2: LucideIcon;
  export const Bot: LucideIcon;
  export const Zap: LucideIcon;
  export const Sparkles: LucideIcon;
  export const FileCode: LucideIcon;
  export const Play: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Filter: LucideIcon;
  export const Info: LucideIcon;
  export const Terminal: LucideIcon;
  export const Lock: LucideIcon;
  export const Mail: LucideIcon;
  export const UserCheck: LucideIcon;
  export const LogIn: LucideIcon;
  export const LogOut: LucideIcon;
  export const Key: LucideIcon;
  export const BadgeCheck: LucideIcon;
}
