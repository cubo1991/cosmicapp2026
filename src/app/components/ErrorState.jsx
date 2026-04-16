"use client";
import Link from "next/link";

export function ErrorState({
  title = "Error",
  message = "Algo salió mal",
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md text-center shadow-lg border-l-4 border-red-500">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
          {title}
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
        {action && (
          <Link
            href={action.href}
            className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
