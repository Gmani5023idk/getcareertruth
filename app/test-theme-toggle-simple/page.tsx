import ThemeToggleTest from '@/components/theme-toggle-simple';

export default function ThemeToggleTestPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-8">
      <h1 className="text-[var(--color-text-primary)] text-2xl mb-4">Theme Toggle Test</h1>
      <div className="mb-6">
        <ThemeToggleTest />
      </div>
      <p className="text-[var(--color-text-secondary)]">
        This is a test page to verify the theme toggle functionality.
      </p>

    </div>
  );
}