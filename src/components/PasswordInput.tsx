"use client";

import { useState } from "react";

// A password field with a show/hide eye toggle. Forwards all standard input
// props (value, onChange, name, required, minLength, placeholder, id…).
export default function PasswordInput({
  className = "input",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...rest} type={show ? "text" : "password"} className={`${className} pe-10`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 end-0 flex items-center px-3 text-ink-400 hover:text-ink-600"
      >
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a18.3 18.3 0 0 1-2.4 3.4M6.1 6.1A18.3 18.3 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.3-.9" />
            <path d="M3 3l18 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
