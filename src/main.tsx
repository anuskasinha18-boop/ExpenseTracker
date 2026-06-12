import React, { FormEvent, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartPie,
  CircleDollarSign,
  CreditCard,
  Edit3,
  GraduationCap,
  Home,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Target,
  Trash2,
  Trophy,
  WalletCards
} from "lucide-react";
import "./styles.css";

enum TransactionKind { Income = "Income", Expense = "Expense" }
enum Category { Hostel = "Hostel", Food = "Food", Books = "Books", Travel = "Travel", Freelance = "Freelance", Scholarship = "Scholarship" }

type Money = number;
type MonthLabel = "January" | "February" | "March" | "April" | "May" | "June" | "July" | "August" | "September" | "October" | "November" | "December";
const months: MonthLabel[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type ApiStatus = "loading" | "ready" | "saving" | "error";
type Page = "Dashboard" | "Transactions" | "Accounts" | "Settings";

interface Transaction { id: number; title: string; category: Category; kind: TransactionKind; amount: Money; account: string; date: string; recurring?: boolean; }
interface RecurringItem { id: number; title: string; category: Category; kind: TransactionKind; amount: Money; account: string; dayOfMonth: number; }
interface TransactionForm { title: string; category: Category; kind: TransactionKind; amount: string; account: string; date: string; }
interface MetricCard { label: string; value: Money; change: string; tone: "blue" | "rose" | "green"; icon: React.ElementType; count: number; }
interface CategoryTile { label: Category; amount: Money; percent: number; color: string; icon: React.ElementType; }

const STORAGE_KEY_TRANSACTIONS = "finance_transactions";
const STORAGE_KEY_RECURRING = "finance_recurring";

const defaultTransactions: Transaction[] = [
  { id: 1, title: "KIIT hostel dues", category: Category.Hostel, kind: TransactionKind.Expense, amount: -5000, account: "Campus Card", date: "2024-03-04" },
  { id: 3, title: "Study materials", category: Category.Books, kind: TransactionKind.Expense, amount: -1250, account: "Debit Card", date: "2024-03-03" },
  { id: 4, title: "Cafeteria", category: Category.Food, kind: TransactionKind.Expense, amount: -680, account: "Cash", date: "2024-03-02" }
];

const defaultRecurring: RecurringItem[] = [
  { id: 1, title: "Monthly scholarship", category: Category.Scholarship, kind: TransactionKind.Income, amount: 10000, account: "Main Bank Account", dayOfMonth: 1 }
];

function getStoredData<T>(key: string, defaultValue: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) { localStorage.setItem(key, JSON.stringify(defaultValue)); return defaultValue; }
  try { return JSON.parse(stored); } catch { return defaultValue; }
}

function saveStoredData<T>(key: string, data: T): void { localStorage.setItem(key, JSON.stringify(data)); }

const categoryStyle: Record<Category, { color: string; icon: React.ElementType }> = {
  [Category.Hostel]: { color: "from-amber-500 to-yellow-700", icon: Home },
  [Category.Food]: { color: "from-fuchsia-600 to-violet-800", icon: ReceiptText },
  [Category.Books]: { color: "from-emerald-500 to-teal-800", icon: GraduationCap },
  [Category.Travel]: { color: "from-cyan-500 to-sky-900", icon: Landmark },
  [Category.Freelance]: { color: "from-rose-500 to-red-900", icon: CircleDollarSign },
  [Category.Scholarship]: { color: "from-lime-500 to-green-900", icon: Trophy }
};

const initialForm: TransactionForm = { title: "", category: Category.Food, kind: TransactionKind.Expense, amount: "", account: "UPI Wallet", date: new Date().toISOString().split('T')[0] };

function formatMoney(v: Money) { return `${v >= 0 ? "+" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`; }
function formatShortDate(v: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(v)); }

async function fetchTransactions(): Promise<Transaction[]> { return new Promise(r => setTimeout(() => r(getStoredData(STORAGE_KEY_TRANSACTIONS, defaultTransactions)), 400)); }
async function fetchRecurringItems(): Promise<RecurringItem[]> { return new Promise(r => setTimeout(() => r(getStoredData(STORAGE_KEY_RECURRING, defaultRecurring)), 300)); }
async function createTransaction(f: TransactionForm): Promise<Transaction> {
  return new Promise(r => {
    setTimeout(() => {
      const ts = getStoredData(STORAGE_KEY_TRANSACTIONS, defaultTransactions);
      const nextId = ts.length > 0 ? Math.max(...ts.map(t => t.id)) + 1 : 1;
      const am = Number(f.amount);
      const nt: Transaction = { ...f, id: nextId, amount: f.kind === TransactionKind.Expense ? -Math.abs(am) : Math.abs(am) };
      saveStoredData(STORAGE_KEY_TRANSACTIONS, [nt, ...ts]);
      r(nt);
    }, 500);
  });
}
async function removeTransaction(id: number): Promise<void> {
  return new Promise(r => {
    setTimeout(() => {
      const ts = getStoredData(STORAGE_KEY_TRANSACTIONS, defaultTransactions);
      saveStoredData(STORAGE_KEY_TRANSACTIONS, ts.filter(t => t.id !== id));
      r();
    }, 300);
  });
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [selectedDate, setSelectedDate] = useState({ month: "March" as MonthLabel, year: 2024 });

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchRecurringItems()])
      .then(([items, rec]) => { setTransactions(items); setRecurringItems(rec); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, []);

  const monthlyTransactions = useMemo(() => {
    const mIdx = months.indexOf(selectedDate.month);
    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === mIdx && d.getFullYear() === selectedDate.year;
    });
    const rec = recurringItems.map(item => ({
      id: -item.id, title: item.title, category: item.category, kind: item.kind, amount: item.kind === TransactionKind.Expense ? -Math.abs(item.amount) : Math.abs(item.amount), account: item.account,
      date: `${selectedDate.year}-${String(mIdx + 1).padStart(2, "0")}-${String(item.dayOfMonth).padStart(2, "0")}`, recurring: true
    }));
    return [...rec, ...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [recurringItems, transactions, selectedDate]);

  const accountBalances = useMemo(() => {
    const accs = ["Main Bank Account", "Campus Card", "Cash", "UPI Wallet", "Debit Card"];
    const colors = ["from-blue-600 to-indigo-600", "from-violet-600 to-purple-600", "from-emerald-600 to-teal-600", "from-rose-600 to-pink-600", "from-amber-600 to-orange-600"];
    const types = ["Savings", "Wallet", "Physical", "Digital", "Bank"];
    return accs.map((name, i) => {
      const balance = transactions.filter(t => t.account === name).reduce((sum, t) => sum + t.amount, 0) + (name === "Main Bank Account" ? 45000 : 0);
      return { name, balance, type: types[i] || "Other", color: colors[i] || "from-slate-600 to-slate-800" };
    });
  }, [transactions]);

  const summary = useMemo(() => {
    const inc = monthlyTransactions.filter(t => t.kind === TransactionKind.Income).reduce((s, t) => s + t.amount, 0);
    const exp = monthlyTransactions.filter(t => t.kind === TransactionKind.Expense).reduce((s, t) => s + Math.abs(t.amount), 0);
    const bal = inc - exp;
    const incCount = monthlyTransactions.filter(t => t.kind === TransactionKind.Income).length;
    const expCount = monthlyTransactions.filter(t => t.kind === TransactionKind.Expense).length;
    const cats = Object.values(Category).map(c => {
      const am = monthlyTransactions.filter(t => t.category === c).reduce((s, t) => s + Math.abs(t.amount), 0);
      const st = categoryStyle[c];
      return { label: c, amount: am, percent: Math.round((am / Math.max(inc + exp, 1)) * 100), color: st.color, icon: st.icon } satisfies CategoryTile;
    });
    const dInM = new Date(selectedDate.year, months.indexOf(selectedDate.month) + 1, 0).getDate();
    const bars = Array.from({ length: 7 }, (_, i) => {
      const seg = monthlyTransactions.filter(t => { const d = new Date(t.date).getDate(); return Math.floor((d - 1) / (dInM / 7)) === i; });
      const si = seg.filter(t => t.kind === TransactionKind.Income).reduce((s, t) => s + t.amount, 0);
      const se = seg.filter(t => t.kind === TransactionKind.Expense).reduce((s, t) => s + Math.abs(t.amount), 0);
      const mx = Math.max(inc, exp, 1);
      return { income: Math.max(8, (si / mx) * 100), expense: Math.max(8, (se / mx) * 100) };
    });
    const metrics: MetricCard[] = [
      { label: "Net Balance", value: bal, change: "Live", tone: "blue", icon: WalletCards, count: monthlyTransactions.length },
      { label: "Total Expenses", value: -exp, change: `${expCount}`, tone: "rose", icon: ArrowDownLeft, count: expCount },
      { label: "Total Income", value: inc, change: `${incCount}`, tone: "green", icon: ArrowUpRight, count: incCount }
    ];
    return { balance: bal, incTotal: inc, expTotal: exp, cats, bars, metrics };
  }, [monthlyTransactions, selectedDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setStatus("saving");
    try {
      const nt = await createTransaction(form);
      setTransactions(prev => [nt, ...prev]);
      setForm({ ...initialForm, kind: form.kind, category: form.category, account: form.account });
      setStatus("ready");
    } catch { setStatus("error"); }
  }

  async function handleDelete(id: number) {
    setStatus("saving");
    try { await removeTransaction(id); setTransactions(prev => prev.filter(t => t.id !== id)); setStatus("ready"); }
    catch { setStatus("error"); }
  }

  if (status === "loading") return <div className="grid h-screen place-items-center bg-[#09041f] text-violet-400 font-black tracking-widest uppercase">Initializing Dashboard...</div>;

  return (
    <main className="min-h-screen overflow-hidden bg-[#09041f] text-slate-100 font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(100,74,255,0.2),transparent_40%),linear-gradient(135deg,rgba(9,4,31,1),rgba(17,5,51,1))]" />
      <section className="relative mx-auto flex min-h-screen max-w-7xl gap-6 p-4 sm:p-6">
        <aside className="hidden w-64 shrink-0 rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-2xl lg:flex flex-col">
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-violet-500/30 bg-gradient-to-br from-pink-400 via-violet-500 to-cyan-400 p-1 transition-transform group-hover:scale-105">
                <div className="grid h-full w-full place-items-center rounded-full bg-[#100936] text-3xl font-black text-white">AS</div>
              </div>
              <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[#100936] bg-emerald-400 shadow-glow" />
            </div>
            <p className="mt-5 text-lg font-black tracking-tight text-white">Anuska Sinha</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Gold Tier Student</p>
            <button onClick={() => { setActivePage("Dashboard"); setTimeout(() => document.getElementById("transaction-form")?.scrollIntoView({ behavior: "smooth" }), 100); }} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-violet-900/40 transition hover:bg-violet-500 active:scale-95">
              <Plus className="h-4 w-4" /> New Entry
            </button>
          </div>
          <nav className="mt-12 space-y-3">
            {[
              { label: "Dashboard", icon: LayoutDashboard },
              { label: "Transactions", icon: ReceiptText },
              { label: "Accounts", icon: CreditCard },
              { label: "Settings", icon: Settings },
            ].map(item => (
              <button key={item.label} onClick={() => setActivePage(item.label as Page)} className={`flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-sm font-bold transition-all ${activePage === item.label ? "bg-white/10 text-white shadow-inner" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}>
                <item.icon className={`h-5 w-5 ${activePage === item.label ? "text-violet-400" : ""}`} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <button className="flex w-full items-center gap-4 px-5 py-4 text-sm font-bold text-slate-600 transition hover:text-rose-400"><LogOut className="h-5 w-5" /> Sign Out</button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-6 py-2">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white">{activePage}</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Analytics for {selectedDate.month}, {selectedDate.year}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <button className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-200 transition hover:bg-white/10 shadow-lg">
                  <CalendarDays className="h-4 w-4 text-violet-400" /> {selectedDate.month} {selectedDate.year}
                </button>
                <div className="absolute right-0 top-full mt-3 hidden group-hover:block z-50 rounded-[2rem] border border-white/5 bg-[#160d45]/95 p-4 shadow-2xl backdrop-blur-2xl min-w-[280px]">
                  <div className="grid grid-cols-3 gap-2">
                    {months.map(m => (
                      <button key={m} onClick={() => setSelectedDate(p => ({ ...p, month: m }))} className={`rounded-xl px-2 py-3 text-[10px] font-black uppercase transition ${selectedDate.month === m ? "bg-violet-600 text-white shadow-glow" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}>{m.slice(0, 3)}</button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between gap-2 border-t border-white/5 pt-4">
                    {[2023, 2024, 2025].map(y => (
                      <button key={y} onClick={() => setSelectedDate(p => ({ ...p, year: y }))} className={`flex-1 rounded-xl py-3 text-[10px] font-black transition ${selectedDate.year === y ? "bg-violet-600 text-white shadow-glow" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}>{y}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button className="grid h-12 w-12 place-items-center rounded-2xl border border-white/5 bg-white/5 text-slate-400 transition hover:bg-violet-600 hover:text-white hover:border-transparent shadow-lg"><Bell className="h-5 w-5" /></button>
            </div>
          </header>

          {activePage === "Dashboard" && (
            <>
              <section className="grid gap-6 md:grid-cols-3">
                {summary.metrics.map(m => (
                  <article key={m.label} className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl transition-all hover:border-violet-500/30 hover:bg-white/[0.04] shadow-2xl">
                    <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-violet-600/5 blur-3xl group-hover:bg-violet-600/10 transition-all" />
                    <div className="flex items-start justify-between relative z-10">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{m.label}</p>
                        <p className="text-4xl font-black tracking-tighter text-white">{formatMoney(m.value)}</p>
                        <div className="flex items-center gap-2 pt-2">
                          <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${m.tone === "blue" ? "bg-blue-500/10 text-blue-400" : m.tone === "rose" ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>{m.change} RECORDED</span>
                        </div>
                      </div>
                      <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${m.tone === "blue" ? "text-blue-400 shadow-blue-500/20" : m.tone === "rose" ? "text-rose-400 shadow-rose-500/20" : "text-emerald-400 shadow-emerald-500/20"} shadow-xl`}><m.icon className="h-7 w-7" /></div>
                    </div>
                  </article>
                ))}
              </section>

              <section className="grid flex-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-6">
                  <article className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl">
                    <div className="mb-8 flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight text-white">Cash Flow</h2><span className="rounded-full bg-violet-500/10 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-violet-400">Monthly Segments</span></div>
                    <div className="h-72 w-full flex items-end justify-between gap-3 px-4">
                      {summary.bars.map((bar, i) => (
                        <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                          <div className="flex w-full items-end justify-center gap-2 px-1">
                            <div className="w-full rounded-full bg-gradient-to-t from-rose-600/60 to-rose-400/20 transition-all group-hover:from-rose-500 group-hover:shadow-glow" style={{ height: `${bar.expense}%` }} />
                            <div className="w-full rounded-full bg-gradient-to-t from-emerald-600/60 to-emerald-400/20 transition-all group-hover:from-emerald-500 group-hover:shadow-glow" style={{ height: `${bar.income}%` }} />
                          </div>
                          <span className="mt-4 text-[10px] font-black text-slate-600 uppercase tracking-tighter group-hover:text-slate-400 transition-colors">Seg {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl">
                    <div className="mb-8 flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight text-white">Recent Activity</h2><button onClick={() => setActivePage("Transactions")} className="text-xs font-black uppercase tracking-widest text-violet-400 transition hover:text-violet-300">View History</button></div>
                    <div className="space-y-4">
                      {monthlyTransactions.slice(0, 4).map(t => (
                        <div key={t.id} className="group flex items-center justify-between rounded-3xl bg-white/[0.03] p-5 transition hover:bg-white/[0.06] hover:scale-[1.01] active:scale-[0.99] cursor-pointer">
                          <div className="flex items-center gap-5">
                            <div className={`grid h-14 w-14 place-items-center rounded-2xl shadow-xl ${t.kind === TransactionKind.Income ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{t.kind === TransactionKind.Income ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownLeft className="h-6 w-6" />}</div>
                            <div><p className="text-base font-black tracking-tight text-white">{t.title}</p><p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.category} • {t.account}</p></div>
                          </div>
                          <div className="flex items-center gap-6"><p className={`text-lg font-black ${t.kind === TransactionKind.Income ? "text-emerald-400" : "text-white"}`}>{formatMoney(t.amount)}</p><button onClick={() => void handleDelete(t.id)} className="opacity-0 transition group-hover:opacity-100"><Trash2 className="h-5 w-5 text-slate-700 hover:text-rose-500" /></button></div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
                <div className="space-y-6">
                  <article id="transaction-form" className="rounded-[2.5rem] border border-white/5 bg-[#100936]/80 p-8 backdrop-blur-2xl shadow-2xl border-violet-500/20">
                    <div className="mb-8 flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight text-white">Quick Log</h2><div className={`h-2 w-2 rounded-full ${status === "saving" ? "bg-violet-400 animate-pulse" : "bg-emerald-400 shadow-glow"}`} /></div>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Label</label><input className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-bold text-white outline-none transition focus:border-violet-500/50 focus:bg-white/10" placeholder="Transaction title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Type</label><select className="w-full appearance-none rounded-2xl border border-white/5 bg-[#160d45] px-5 py-4 text-sm font-bold text-white outline-none transition focus:border-violet-500/50" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as TransactionKind })}>{Object.values(TransactionKind).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                        <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Value</label><input className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-bold text-white outline-none transition focus:border-violet-500/50 focus:bg-white/10" placeholder="0.00" type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
                      </div>
                      <button disabled={status === "saving"} className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-violet-900/40 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">Create Transaction</button>
                    </form>
                  </article>
                  <article className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl">
                    <div className="mb-8 flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight text-white">Budgets</h2><ChartPie className="h-6 w-6 text-violet-400" /></div>
                    <div className="space-y-6">
                      {summary.cats.slice(0, 4).map(c => (
                        <div key={c.label} className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-3"><c.icon className="h-4 w-4 text-violet-400" /> {c.label}</span><span>{c.percent}%</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-white/5 p-0.5"><div className={`h-full rounded-full bg-gradient-to-r ${c.color} shadow-glow`} style={{ width: `${c.percent}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </section>
            </>
          )}

          {activePage === "Transactions" && (
            <article className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl shadow-2xl flex-1 overflow-hidden flex flex-col">
              <div className="mb-10 flex items-center justify-between"><h2 className="text-3xl font-black tracking-tighter text-white">Statement</h2><div className="flex gap-3"><button className="rounded-2xl bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition hover:bg-white/10">Filter</button><button className="rounded-2xl bg-violet-600 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-violet-500 shadow-glow">Export PDF</button></div></div>
              <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                {monthlyTransactions.map(t => (
                  <div key={t.id} className="group flex items-center justify-between rounded-[2rem] bg-white/[0.03] p-6 transition hover:bg-white/[0.06] hover:translate-x-1">
                    <div className="flex items-center gap-6">
                      <div className={`grid h-16 w-16 place-items-center rounded-2xl shadow-2xl ${t.kind === TransactionKind.Income ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{t.kind === TransactionKind.Income ? <ArrowUpRight className="h-7 w-7" /> : <ArrowDownLeft className="h-7 w-7" />}</div>
                      <div><p className="text-lg font-black tracking-tight text-white">{t.title}</p><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.category} • {t.account} • {t.recurring ? "MONTHLY" : formatShortDate(t.date)}</p></div>
                    </div>
                    <div className="flex items-center gap-10"><p className={`text-xl font-black ${t.kind === TransactionKind.Income ? "text-emerald-400" : "text-white"}`}>{formatMoney(t.amount)}</p>{!t.recurring ? <button onClick={() => void handleDelete(t.id)} className="rounded-xl bg-rose-500/10 p-4 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/20"><Trash2 className="h-6 w-6 text-rose-400" /></button> : <div className="w-14" />}</div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {activePage === "Accounts" && (
            <section className="grid flex-1 gap-6 md:grid-cols-2 content-start">
              {accountBalances.map(acc => (
                <article key={acc.name} className={`rounded-[3rem] border border-white/10 bg-gradient-to-br ${acc.color} p-10 shadow-2xl transition hover:scale-[1.03] hover:rotate-1 relative overflow-hidden group`}>
                  <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-white/10 blur-3xl transition-all group-hover:scale-150" />
                  <div className="flex items-start justify-between relative z-10"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">{acc.type}</p><h3 className="mt-2 text-2xl font-black tracking-tighter text-white">{acc.name}</h3></div><CreditCard className="h-8 w-8 text-white/40" /></div>
                  <div className="mt-16 relative z-10"><p className="text-xs font-bold text-white/60 uppercase tracking-widest">Available Balance</p><p className="mt-2 text-5xl font-black tracking-tighter text-white">{formatMoney(acc.balance)}</p></div>
                </article>
              ))}
            </section>
          )}

          {activePage === "Settings" && (
            <article className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-10 backdrop-blur-xl shadow-2xl flex-1">
              <h2 className="text-3xl font-black tracking-tighter text-white mb-10">Preferences</h2>
              <div className="space-y-6 max-w-2xl">
                {[
                  { label: "Currency Unit", value: "Indian Rupee (₹)", icon: CircleDollarSign },
                  { label: "Interface Theme", value: "Ultraviolet Dark", icon: Lightbulb },
                  { label: "Alert Notifications", value: "Push + Email", icon: Bell },
                  { label: "Monthly Budget Target", value: "30,000 Rs.", icon: Target },
                  { label: "Cloud Sync", value: "Enabled (LocalFirst)", icon: ListChecks },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between rounded-3xl bg-white/[0.03] p-6 transition hover:bg-white/[0.06] cursor-pointer group">
                    <div className="flex items-center gap-6"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all"><s.icon className="h-6 w-6" /></div><p className="text-base font-black tracking-tight text-white">{s.label}</p></div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{s.value}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
