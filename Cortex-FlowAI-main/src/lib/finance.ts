import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data ?? { id: u.user.id, name: u.user.email?.split("@")[0] ?? "", email: u.user.email ?? "", avatar_url: null };
    },
  });
}

export type Transaction = {
  id: string;
  user_id: string;
  occurred_on: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  created_at: string;
};

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
