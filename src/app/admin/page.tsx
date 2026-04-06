import { redirect } from "next/navigation"

export default function AdminDashboard() {
  // Bu sayfa middleware ile korumalı olacak
  // Şimdilik basit redirect
  return redirect("/admin/mentors")
}