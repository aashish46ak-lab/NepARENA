import {
  Facebook, Instagram, Youtube, Twitch, Send, MessageCircle, Music2,
  Linkedin, Globe, Twitter, Gamepad2, Github, type LucideIcon,
} from "lucide-react";

export interface PlatformDef {
  value: string;
  label: string;
  icon: LucideIcon;
  /** brand tint used for the icon chip */
  color: string;
}

export const PLATFORMS: PlatformDef[] = [
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-[#1877F2]" },
  { value: "messenger", label: "Messenger", icon: MessageCircle, color: "text-[#00B2FF]" },
  { value: "discord", label: "Discord", icon: Gamepad2, color: "text-[#5865F2]" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-[#25D366]" },
  { value: "youtube", label: "YouTube", icon: Youtube, color: "text-[#FF0000]" },
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-[#E1306C]" },
  { value: "tiktok", label: "TikTok", icon: Music2, color: "text-foreground" },
  { value: "twitter", label: "Twitter / X", icon: Twitter, color: "text-foreground" },
  { value: "telegram", label: "Telegram", icon: Send, color: "text-[#229ED9]" },
  { value: "twitch", label: "Twitch", icon: Twitch, color: "text-[#9146FF]" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-[#0A66C2]" },
  { value: "github", label: "GitHub", icon: Github, color: "text-foreground" },
  { value: "website", label: "Website", icon: Globe, color: "text-brand-glow" },
];

export function getPlatform(platform?: string | null): PlatformDef {
  const key = (platform ?? "").trim().toLowerCase();
  return (
    PLATFORMS.find((p) => p.value === key || p.label.toLowerCase() === key) ??
    { value: key || "website", label: platform || "Link", icon: Globe, color: "text-brand-glow" }
  );
}

export function PlatformIcon({ platform, className }: { platform?: string | null; className?: string }) {
  const def = getPlatform(platform);
  const Icon = def.icon;
  return <Icon className={className ?? `h-5 w-5 ${def.color}`} />;
}