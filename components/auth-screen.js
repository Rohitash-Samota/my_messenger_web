"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

import { login, register } from "@/lib/api";

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", mobileNumber: "" });

  const update = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const session = mode === "login" ? await login(form) : await register(form);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message || "We couldn’t sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071116] p-4 text-white sm:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-32px)] max-w-6xl overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#101b21] shadow-2xl shadow-black/40 lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#173e3a] via-[#102b2e] to-[#08161c] p-12 lg:flex lg:flex-col">
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_25%_20%,rgba(48,225,166,.45),transparent_26%),radial-gradient(circle_at_85%_75%,rgba(44,133,157,.35),transparent_28%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-300 text-[#07382c]"><MessageCircle size={24} fill="currentColor" /></span>
            <span className="text-xl font-extrabold tracking-[-0.04em]">Wavely</span>
          </div>
          <div className="relative z-10 my-auto max-w-lg">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><Sparkles size={15} /> Your people, closer</p>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-[-0.055em]">Conversations that feel effortless.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/55">Message, share, and make secure voice or video calls from one calm, beautifully focused space.</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 text-xs text-white/45"><ShieldCheck size={18} className="text-emerald-300" /> Protected with encrypted transport and secure session tokens.</div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-emerald-300 text-[#07382c]"><MessageCircle size={21} fill="currentColor" /></span><span className="text-lg font-extrabold">Wavely</span></div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">Welcome {mode === "login" ? "back" : "aboard"}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em]">{mode === "login" ? "Sign in to continue" : "Create your account"}</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#7f929b]">{mode === "login" ? "Pick up right where your conversations left off." : "Start messaging in less than a minute."}</p>

            <form className="mt-8 space-y-4" onSubmit={submit}>
              <label className="block"><span className="mb-2 block text-[11px] font-bold text-white/65">Email address</span><span className="flex h-12 items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/15 px-4 focus-within:border-emerald-400/35"><Mail size={17} className="text-[#71868e]" /><input required type="email" autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@example.com" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" /></span></label>
              {mode === "register" ? <label className="block"><span className="mb-2 block text-[11px] font-bold text-white/65">Mobile number</span><span className="flex h-12 items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/15 px-4 focus-within:border-emerald-400/35"><Phone size={17} className="text-[#71868e]" /><input required inputMode="numeric" pattern="[0-9]{10}" value={form.mobileNumber} onChange={update("mobileNumber")} placeholder="10-digit number" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" /></span></label> : null}
              <label className="block"><span className="mb-2 block text-[11px] font-bold text-white/65">Password</span><span className="flex h-12 items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/15 px-4 focus-within:border-emerald-400/35"><LockKeyhole size={17} className="text-[#71868e]" /><input required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={update("password")} placeholder="At least 8 characters" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-lg p-1 text-white/35 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>

              {error ? <p className="rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2.5 text-xs text-rose-200" role="alert">{error}</p> : null}

              <button disabled={submitting} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-extrabold text-[#063328] shadow-lg shadow-emerald-950/25 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60">
                {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                {!submitting ? <ArrowRight size={17} /> : null}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[#71858e]">{mode === "login" ? "New to Wavely?" : "Already have an account?"} <button type="button" onClick={() => { setMode((value) => value === "login" ? "register" : "login"); setError(""); }} className="font-bold text-emerald-300 hover:text-emerald-200">{mode === "login" ? "Create an account" : "Sign in"}</button></p>
          </div>
        </section>
      </div>
    </div>
  );
}
