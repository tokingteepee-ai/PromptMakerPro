import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">404 – Page not found</h1>
      <p>
        The page you requested doesn&apos;t exist. It may have been moved or deleted.
      </p>
      <Link href="/" className="underline">
        Go back to the homepage
      </Link>
    </main>
  );
}
