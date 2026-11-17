import dynamic from "next/dynamic";

const AdminClient = dynamic(() => import("./admin-client"));

export const metadata = { title: "Administração · Busca Evidência", robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminClient />; }
