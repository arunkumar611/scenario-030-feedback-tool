import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", user.id)
    .single();

  const { data: company } = profile
    ? await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .single()
    : { data: null };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-8">
              <Link href="/surveys" className="font-semibold text-lg text-blue-600">
                FeedbackTool
              </Link>
              <div className="hidden sm:flex items-center gap-6 text-sm">
                <Link href="/surveys" className="text-gray-700 hover:text-gray-900">
                  Surveys
                </Link>
                <Link href="/nps" className="text-gray-700 hover:text-gray-900">
                  NPS
                </Link>
                <Link href="/analytics" className="text-gray-700 hover:text-gray-900">
                  Analytics
                </Link>
                <Link href="/webhooks" className="text-gray-700 hover:text-gray-900">
                  Webhooks
                </Link>
                <Link href="/export" className="text-gray-700 hover:text-gray-900">
                  Export
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{company?.name}</span>
              <Link href="/settings" className="text-sm text-gray-700 hover:text-gray-900">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
