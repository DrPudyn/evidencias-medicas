import { json } from "@/lib/server";
export async function POST() {
  return json({ error: "O acesso por código foi encerrado. Use e-mail e senha." }, 410);
}
