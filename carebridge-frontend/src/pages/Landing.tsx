import { Link } from "react-router-dom";

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-xl font-bold text-white shadow-lg shadow-indigo-500/10">
              CB
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">CareBridge</p>
              <p className="text-sm font-semibold text-slate-900">AI health care companion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-screen-2xl flex-col justify-between px-6 py-16 lg:px-10">
        <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <p className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-sm shadow-slate-900/10">
              AI-powered care
            </p>
            <div className="space-y-6">
              <h1 className="max-w-3xl text-6xl font-bold leading-tight tracking-tight text-slate-950 sm:text-7xl">
                The smarter way to assess symptoms, connect with doctors, and manage your care.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                CareBridge gives patients, therapists, and hospitals a fast, secure health platform powered by AI diagnosis, location-based recommendations, and appointment coordination.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
              >
                Get Started
              </Link>
              <Link
                to="/assessment"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                Take a quick assessment
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-sky-500 to-cyan-400 p-6 shadow-2xl shadow-slate-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.35),_transparent_30%)]" />
            <div className="relative grid gap-6 rounded-[1.75rem] bg-slate-950/95 p-8 text-white backdrop-blur-sm">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Trusted by care teams</p>
                <h2 className="text-3xl font-bold">Your health, simplified.</h2>
                <p className="text-slate-300">Search symptoms, select your location, and get expert recommendations with one elegant dashboard.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-900/80 p-5 ring-1 ring-white/10">
                  <p className="text-sm text-slate-400">Fast symptom assessment</p>
                  <p className="mt-3 text-xl font-semibold">One-minute health check</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5 ring-1 ring-white/10">
                  <p className="text-sm text-slate-400">Location-aware care</p>
                  <p className="mt-3 text-xl font-semibold">Find nearby help</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5 ring-1 ring-white/10">
                  <p className="text-sm text-slate-400">Secure access</p>
                  <p className="mt-3 text-xl font-semibold">Private patient dashboard</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5 ring-1 ring-white/10">
                  <p className="text-sm text-slate-400">Appointment support</p>
                  <p className="mt-3 text-xl font-semibold">Connect with specialists</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white/90 p-10 shadow-xl shadow-slate-300/10 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Why CareBridge?</p>
            <h2 className="text-2xl font-bold text-slate-950">Built to help everyone in the care journey.</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="font-semibold text-slate-900">Patients</p>
            <p>Get an easy symptom check, accurate location selection, and the nearest hospital recommendations instantly.</p>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="font-semibold text-slate-900">Therapists & hospitals</p>
            <p>Manage referrals, patient requests, and care history from one polished interface.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-10 px-6 py-12 lg:px-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg font-bold text-white">CB</div>
              <div>
                <p className="text-lg font-semibold text-white">CareBridge</p>
                <p className="text-sm text-slate-400">AI diagnosis + care coordination for patients, therapists, and hospitals.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Product</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>Health assessment</li>
                <li>Location-based care</li>
                <li>Appointment support</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Resources</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>Privacy</li>
                <li>Terms</li>
                <li>Support</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Get started</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/register" className="text-slate-200 transition hover:text-white">
                    Register
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-slate-200 transition hover:text-white">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 px-6 py-4 text-center text-sm text-slate-500 lg:px-10">
          © {new Date().getFullYear()} CareBridge. Designed for fast, secure care navigation.
        </div>
      </footer>
    </div>
  );
}

export default Landing;
