import { useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "@travada-books/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@travada-books/ui/components/card";
import { supabase } from "@/lib/supabase";

const OTP_LENGTH = 8;

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? "";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (index: number) => inputRefs.current[index]?.focus();

  const handleChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) focusAt(index + 1);
  }, []);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          setDigits((prev) => {
            const next = [...prev];
            next[index] = "";
            return next;
          });
        } else if (index > 0) {
          focusAt(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        focusAt(index - 1);
      } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        focusAt(index + 1);
      }
    },
    [digits],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    setDigits((prev) => {
      const next = [...prev];
      pasted.split("").forEach((char, i) => {
        next[i] = char;
      });
      return next;
    });
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = digits.join("");
    if (token.length < OTP_LENGTH) return;
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/forgot-password/reset", { state: { email } });
  }

  async function handleResend() {
    setDigits(Array(OTP_LENGTH).fill(""));
    setError("");
    focusAt(0);
    await supabase.auth.resetPasswordForEmail(email);
  }

  const isFilled = digits.every(Boolean);

  return (
    <Card>
      <CardHeader className='text-center'>
        <CardTitle className='text-base'>Check your email</CardTitle>
        <CardDescription>
          We sent an 8-digit code to{" "}
          <span className='font-medium text-foreground'>
            {email || "your email"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
          <div className='flex justify-center gap-2.5' onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type='text'
                inputMode='numeric'
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoFocus={i === 0}
                className='size-11 rounded-md border bg-background text-center text-base font-semibold tracking-widest caret-transparent outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              />
            ))}
          </div>

          {error && (
            <p className='text-center text-xs text-destructive'>{error}</p>
          )}

          <div className='flex flex-col gap-3'>
            <Button
              type='submit'
              className='w-full'
              disabled={!isFilled || loading}
            >
              {loading ? "Verifying…" : "Verify code"}
            </Button>

            <p className='text-center text-xs text-muted-foreground'>
              Didn&apos;t receive it?{" "}
              <button
                type='button'
                onClick={handleResend}
                className='text-foreground underline-offset-4 hover:underline'
              >
                Resend code
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
