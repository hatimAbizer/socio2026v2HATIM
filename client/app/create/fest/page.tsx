"use client";

import React from "react";
import CreateFestForm from "../../_components/CreateFestForm";
import Link from "next/link";

export default function CreateFestPage() {
  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8 lg:px-12">
        <div className="rounded-2xl border border-[#154CB3]/20 bg-gradient-to-r from-[#154CB3]/10 to-[#30A4EF]/10 p-4">
          <p className="text-sm font-semibold text-[#154CB3]">Looking for the approval prototype website?</p>
          <p className="mt-1 text-sm text-[#1f2a44]">Open the interactive mock here.</p>
          <Link
            href="/prototype-website"
            className="mt-3 inline-flex items-center rounded-xl bg-[#154CB3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f3a88]"
          >
            Open Approval Prototype
          </Link>
        </div>
      </div>

      <CreateFestForm />
    </div>
  );
}
