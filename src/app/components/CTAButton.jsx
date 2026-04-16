"use client";
import Link from "next/link";

export function CTAButton({ href, icon, title, description }) {
  return (
    <Link href={href} className="group block h-full">
      <div className="h-full bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg p-8 transition-all duration-300 transform hover:scale-105 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer shadow-md hover:shadow-xl">
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </Link>
  );
}

export default CTAButton;
