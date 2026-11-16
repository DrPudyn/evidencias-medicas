export type Profile = {
  name: string;
  email: string;
  role: string;
  crm: string;
  college: string;
  state: string;
  phone: string;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  id?: string;
  theme?: "light" | "dark";
};

export const blankProfile: Profile = {
  name: "",
  email: "",
  role: "doctor",
  crm: "",
  college: "",
  state: "",
  phone: "",
  emailNotifications: false,
  whatsappNotifications: false,
};

export type AppModal = null | "auth" | "guide" | "privacy" | "profile" | "detail";
