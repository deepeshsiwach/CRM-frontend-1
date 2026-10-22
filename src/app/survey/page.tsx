
"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { getToken, getUserRole } from "@/lib/auth";

type SurveyContact = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  respondent_group: string;
  raw: Record<string, string>;
  normalizedPhone: string;
  phoneIssue: string;
};

type ContactFilter = "all" | "valid" | "invalid";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }

      row.push(cell);

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);

  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizePhone(value: string): {
  phone: string;
  issue: string;
} {
  let digits = value.replace(/\D/g, "");

  if (!digits) {
    return {
      phone: "",
      issue: "Phone number missing",
    };
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Indian mobile number without country code
  if (digits.length === 10) {
    return {
      phone: `91${digits}`,
      issue: "",
    };
  }

  // Indian mobile number with country code
  if (digits.length === 12 && digits.startsWith("91")) {
    return {
      phone: digits,
      issue: "",
    };
  }

  return {
    phone: "",
    issue: "Invalid phone number — check country code and digits",
  };
}

function findColumn(headers: string[], options: string[]): number {
  const normalized = headers.map((header) =>
    header.trim().toLowerCase().replace(/[\s-]+/g, "_")
  );

  return normalized.findIndex((header) => options.includes(header));
}

function buildContacts(csvText: string): SurveyContact[] {
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) =>
    header.trim().replace(/^\uFEFF/, "")
  );

  const nameIndex = findColumn(headers, [
    "full_name",
    "fullname",
    "name",
    "respondent_name",
  ]);

  const phoneIndex = findColumn(headers, [
    "phone",
    "phone_number",
    "mobile",
    "mobile_number",
    "contact_number",
  ]);

  const emailIndex = findColumn(headers, [
    "email",
    "email_address",
    "mail",
  ]);

  const groupIndex = findColumn(headers, [
    "respondent_group",
    "respondent_type",
    "group",
    "university",
  ]);

  return rows.slice(1).map((values, index) => {
    const raw: Record<string, string> = {};

    headers.forEach((header, i) => {
      raw[header] = (values[i] ?? "").trim();
    });

    const phone =
      phoneIndex >= 0 ? (values[phoneIndex] ?? "").trim() : "";

    const normalized = normalizePhone(phone);

    return {
      id: `${index}-${phone}-${values[nameIndex] ?? ""}`,
      full_name:
        nameIndex >= 0 ? (values[nameIndex] ?? "").trim() : "",
      phone,
      email:
        emailIndex >= 0 ? (values[emailIndex] ?? "").trim() : "",
      respondent_group:
        groupIndex >= 0 ? (values[groupIndex] ?? "").trim() : "",
      raw,
      normalizedPhone: normalized.phone,
      phoneIssue: normalized.issue,
    };
  });
}

export default function SurveyPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authorized, setAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [contacts, setContacts] = useState<SurveyContact[]>([]);
  const [fileName, setFileName] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("all");


  const [notice, setNotice] = useState("");
  const [whatsAppOpenedIds, setWhatsAppOpenedIds] = useState<string[]>([]);

  const [message, setMessage] = useState(
    "Hello {name},\n\nGreetings from ISFT (International School of Financial Trading)! We hope you are doing well. We would like to invite you to connect with us and learn more about our training programs. Please let us know a convenient time to speak.\n\nRegards,\nISFT Team"
  );

  // Restore WhatsApp-open tracking saved in this browser
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("surveyWhatsAppOpenedIds");
      if (saved) {
        setWhatsAppOpenedIds(JSON.parse(saved) as string[]);
      }
    } catch {
      // Ignore unavailable or invalid browser storage.
    }
  }, []);

  // ADMIN-ONLY PAGE ACCESS
  useEffect(() => {
    const token = getToken();
    const role = getUserRole().toUpperCase();

    if (!token) {
      router.replace("/");
      return;
    }

    if (role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }

    setAuthorized(true);
    setAuthChecking(false);
  }, [router]);

  const validCount = contacts.filter(
    (contact) => !!contact.normalizedPhone
  ).length;

  const invalidCount = contacts.length - validCount;
  const openedCount = contacts.filter((contact) =>
    whatsAppOpenedIds.includes(contact.id)
  ).length;
  const remainingCount = Math.max(0, validCount - openedCount);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesSearch =
        !query ||
        [
          contact.full_name,
          contact.phone,
          contact.email,
          contact.respondent_group,
        ].some((value) => value.toLowerCase().includes(query));

      const matchesFilter =
        filter === "all" ||
        (filter === "valid" && !!contact.normalizedPhone) ||
        (filter === "invalid" && !contact.normalizedPhone);

      return matchesSearch && matchesFilter;
    });
  }, [contacts, search, filter]);

  // IMPORT CONTACTS FROM CSV
  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setNotice("Please upload a CSV file (.csv).");
      event.target.value = "";
      return;
    }

    try {
      const parsed = buildContacts(await file.text());

      if (!parsed.length) {
        setNotice(
          "No contact rows found. Please check that the CSV has a header row and data."
        );
        event.target.value = "";
        return;
      }

      setContacts(parsed);
      setFileName(file.name);
      setSearch("");
      setFilter("all");

      const valid = parsed.filter(
        (contact) => !!contact.normalizedPhone
      ).length;

      setNotice(
        `Imported ${parsed.length} rows. ${valid} have a valid WhatsApp number.`
      );
    } catch {
      setNotice(
        "Could not read this CSV. Please export it as UTF-8 CSV and try again."
      );
      event.target.value = "";
    }
  }

  // OPEN PERSONALIZED WHATSAPP CHAT
  function openWhatsApp(contact: SurveyContact) {
    if (!contact.normalizedPhone) {
      setNotice("This contact does not have a valid phone number.");
      return;
    }

    let personalized = message.replaceAll(
      "{name}",
      contact.full_name || "there"
    );

    const url = `https://wa.me/${contact.normalizedPhone}?text=${encodeURIComponent(
      personalized
    )}`;

    // Open directly from the button click to avoid popup blockers.
    const newWindow = window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

    if (!newWindow) {
      setNotice(
        "WhatsApp could not open. Please allow pop-ups for this CRM site."
      );
      return;
    }

    
  }

  // DOWNLOAD CONTACTS WITH INVALID OR MISSING PHONE NUMBERS
  function downloadInvalidRows() {
    const invalid = contacts.filter(
      (contact) => !contact.normalizedPhone
    );

    if (!invalid.length) {
      setNotice("There are no invalid or missing phone numbers to download.");
      return;
    }

    const headers = [
      ...new Set(
        invalid.flatMap((contact) => Object.keys(contact.raw))
      ),
      "phone_validation_issue",
    ];

    const escapeCell = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCell).join(","),
      ...invalid.map((contact) =>
        headers
          .map((header) =>
            escapeCell(
              header === "phone_validation_issue"
                ? contact.phoneIssue
                : contact.raw[header] ?? ""
            )
          )
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "survey-invalid-phone-numbers.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setNotice(`Downloaded ${invalid.length} invalid contact rows.`);
  }

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Checking access…
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              ADMIN WORKSPACE
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Survey Contacts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Upload survey contacts and prepare personalized WhatsApp messages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Upload CSV
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* STATUS MESSAGE */}
        {notice && (
          <div
            role="status"
            className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"
          >
            {notice}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total rows</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {contacts.length}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">WhatsApp-ready</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {validCount}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Missing / invalid phone
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {invalidCount}
            </p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">WhatsApp opened</p>
            <p className="mt-2 text-3xl font-bold text-sky-700">
              {openedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Chats opened from this page
            </p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Remaining</p>
            <p className="mt-2 text-3xl font-bold text-violet-700">
              {remainingCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Valid numbers not yet opened
            </p>
          </div>
        </div>

        {/* WHATSAPP MESSAGE TEMPLATE */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-slate-900">
                WhatsApp message template
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Use <code className="rounded bg-slate-100 px-1 py-0.5">{"{name}"}</code>{" "}
                to personalize the greeting. You review and send each message manually.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setMessage(
                  "Hello {name},\n\nGreetings from ISFT! We would like to invite you to connect with us. Please reply with a convenient time to speak.\n\nRegards,\nISFT Team"
                )
              }
              className="self-start rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset template
            </button>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <p className="mt-2 text-xs text-slate-500">
            Indian phone numbers are normalized with country code +91.
            Messages are not sent automatically or tracked by this page.
          </p>
        </section>

        {/* SURVEY CONTACTS TABLE */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Survey records
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {fileName || "No CSV uploaded yet"}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, email…"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as ContactFilter)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All records</option>
                <option value="valid">WhatsApp-ready</option>
                <option value="invalid">Missing / invalid phone</option>
              </select>

              <button
                type="button"
                onClick={downloadInvalidRows}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Download invalid rows
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone from CSV</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Group / type</th>
                  <th className="px-4 py-3">WhatsApp</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact, index) => (
                  <tr key={contact.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {index + 1}
                    </td>

                    <td className="min-w-40 px-4 py-3 font-medium text-slate-900">
                      {contact.full_name || "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {contact.phone || (
                        <span className="text-amber-700">Missing</span>
                      )}

                      {contact.phoneIssue && contact.phone && (
                        <p className="mt-1 max-w-52 text-xs text-amber-700">
                          {contact.phoneIssue}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {contact.email || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {contact.respondent_group || "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {contact.normalizedPhone ? (
                        <button
  type="button"
  onClick={() => openWhatsApp(contact)}
  className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-green-400"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .15 5.35.15 11.92c0 2.1.55 4.16 1.6 5.98L.05 24l6.25-1.64a11.9 11.9 0 0 0 5.76 1.47h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.47-8.43ZM12.07 21.8a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.71.97.99-3.62-.23-.37a9.86 9.86 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.9-9.9a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.9 7c0 5.45-4.45 9.88-9.92 9.88Zm5.43-7.41c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
  </svg>
  WhatsApp
</button>
                      ) : (
                        <span
                          className="text-xs text-slate-400"
                          title={contact.phoneIssue}
                        >
                          Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {!filteredContacts.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {contacts.length
                        ? "No records match your search/filter."
                        : "Upload your survey CSV to display contacts here."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Showing {filteredContacts.length} of {contacts.length} records.
            Survey rows are processed in your browser and are not uploaded to
            the CRM server.
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
