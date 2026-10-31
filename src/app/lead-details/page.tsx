"use client";



// ============================================================

// DERIVION CRM - LEAD DETAILS PAGE

// Ported from lead-details.html + lead-details.js

// ============================================================



import { Suspense, useEffect, useState, useCallback } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import DashboardLayout from "@/components/DashboardLayout";

import { API_BASE_URL } from "@/lib/config";

import { getToken } from "@/lib/auth";



interface Lead {

  id: number;

  fullName?: string;

  email?: string;

  phone?: string;

  age?: number | null;

  courseInterested?: string;

  leadSource?: string;

  status?: string;

  priority?: string;

  city?: string;

  education?: string;

  currentProfession?: string;

  primaryObjective?: string;

  tradingInvestmentExperience?: string;

  customerLookingFor?: string;

  interestedArea?: string;

  campaignId?: number | null;

}



interface CallLog {

  id: number;

  agentId?: number;

  callStatus?: string;

  outcome?: string;

  duration?: number;

  remarks?: string;

}



interface FollowUp {

  id: number;

  agentId?: number;

  followUpDate?: string;

  purpose?: string;

  status?: string;

  remarks?: string;

}



interface Note {

  id: number;

  userId?: number;

  leadId?: number;

  note?: string;

}

interface KnowledgeBankItem {
  id: number;
  userId: number;
  title: string;
  category: string;
  content?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt?: string;
}



interface Team {

  id: number;

  name?: string;

  teamName?: string;

  title?: string;

  status?: string;

}



interface User {

  id: number;

  fullName?: string;

  name?: string;

  username?: string;

  email?: string;

  role?: string;

  status?: string;

}



function LeadDetailsContent() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const leadId = searchParams.get("id");



  const [lead, setLead] = useState<Lead | null>(null);

  const [loading, setLoading] = useState(true);



  // Editable fields

  const [editName, setEditName] = useState("");

  const [editEmail, setEditEmail] = useState("");

  const [editPhone, setEditPhone] = useState("");

  const [editAge, setEditAge] = useState("");

  const [editCity, setEditCity] = useState("");

  const [editEducation, setEditEducation] = useState("");

  const [editCurrentProfession, setEditCurrentProfession] = useState("");

  const [editPrimaryObjective, setEditPrimaryObjective] = useState("");

  const [editTradingExperience, setEditTradingExperience] = useState("");

  const [editCustomerLookingFor, setEditCustomerLookingFor] = useState("");

  const [editInterestedArea, setEditInterestedArea] = useState("");

  const [editStatus, setEditStatus] = useState("NEW");

  const [editPriority, setEditPriority] = useState("");

  const [whatsappTemplate, setWhatsappTemplate] = useState(

  "Hi {name}, I'm {agentName} from ISFT. I'm contacting you regarding your course enquiry."

);



const [emailSubject, setEmailSubject] = useState(

  "Your Course Enquiry - ISFT"

);



const [emailTemplate, setEmailTemplate] = useState(

  "Dear {name},\n\nGreetings from ISFT (International School of Financial Trading)!\n\nI'm {agentName}, and I'm contacting you regarding your course enquiry. Please let me know a convenient time to speak.\n\nRegards,\n{agentName}\nISFT Team"

);

const [showOutreachTemplates, setShowOutreachTemplates] = useState(false);



const [agentName, setAgentName] = useState("ISFT Team");



useEffect(() => {

  if (typeof window === "undefined") return;



  const userId = localStorage.getItem("userId") || "current-user";

  const savedAgentName =

    localStorage.getItem("userName") ||

    localStorage.getItem("username") ||

    "ISFT Team";



  setAgentName(savedAgentName);



  const savedWhatsApp = localStorage.getItem(

    `derivion_whatsapp_template_${userId}`

  );

  const savedEmailSubject = localStorage.getItem(

    `derivion_email_subject_${userId}`

  );

  const savedEmail = localStorage.getItem(

    `derivion_email_template_${userId}`

  );



  if (savedWhatsApp) setWhatsappTemplate(savedWhatsApp);

  if (savedEmailSubject) setEmailSubject(savedEmailSubject);

  if (savedEmail) setEmailTemplate(savedEmail);

}, []);



const saveOutreachTemplates = () => {

  const userId = localStorage.getItem("userId") || "current-user";



  localStorage.setItem(

    `derivion_whatsapp_template_${userId}`,

    whatsappTemplate

  );

  localStorage.setItem(

    `derivion_email_subject_${userId}`,

    emailSubject

  );

  localStorage.setItem(

    `derivion_email_template_${userId}`,

    emailTemplate

  );



  setSaveMessage({

    text: "Your WhatsApp and email templates have been saved.",

    isError: false,

  });

};



const personalizeMessage = (template: string) =>

  template

    .replace(/\{name\}/gi, lead?.fullName || "there")

    .replace(/\{agentName\}/gi, agentName);





  const [saveMessage, setSaveMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [saving, setSaving] = useState(false);



  // Activities

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  const [callLogsLoading, setCallLogsLoading] = useState(true);



  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  const [followUpsLoading, setFollowUpsLoading] = useState(true);



  const [notes, setNotes] = useState<Note[]>([]);

  const [notesLoading, setNotesLoading] = useState(true);



  // Transfer modal

  const [transferOpen, setTransferOpen] = useState(false);

  const [knowledgeBankOpen, setKnowledgeBankOpen] = useState(false);

  const [knowledgeBankItems, setKnowledgeBankItems] = useState<KnowledgeBankItem[]>([]);
const [knowledgeBankLoading, setKnowledgeBankLoading] = useState(false);
const [knowledgeBankError, setKnowledgeBankError] = useState("");

const [selectedKnowledgeBankCategory, setSelectedKnowledgeBankCategory] =
  useState<string | null>(null);

const [showKnowledgeBankForm, setShowKnowledgeBankForm] = useState(false);
const [newMaterialTitle, setNewMaterialTitle] = useState("");
const [newMaterialCategory, setNewMaterialCategory] = useState("calling-scripts");
const [newMaterialContent, setNewMaterialContent] = useState("");
const [savingKnowledgeBank, setSavingKnowledgeBank] = useState(false);
const [knowledgeBankMessage, setKnowledgeBankMessage] = useState("");

const [newMaterialFile, setNewMaterialFile] = useState<File | null>(null);



  const [teams, setTeams] = useState<Team[]>([]);

  const [agents, setAgents] = useState<User[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [selectedAgentId, setSelectedAgentId] = useState("");

  const [transferMessage, setTransferMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [transferring, setTransferring] = useState(false);



  const token = getToken();

  const filteredKnowledgeBankItems = selectedKnowledgeBankCategory
  ? knowledgeBankItems.filter(
      (item) => item.category === selectedKnowledgeBankCategory
    )
  : knowledgeBankItems;

  // Load the logged-in user's personal Knowledge Bank materials.
useEffect(() => {
  if (!knowledgeBankOpen) return;

  let cancelled = false;

  const loadKnowledgeBank = async () => {
    if (!token) {
      setKnowledgeBankError("Your session has expired. Please log in again.");
      return;
    }

    setKnowledgeBankLoading(true);
    setKnowledgeBankError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge-bank`, {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to load Knowledge Bank.");
      }

      const data: KnowledgeBankItem[] = await res.json();

      if (!cancelled) {
        setKnowledgeBankItems(data);
      }
    } catch (error) {
      if (!cancelled) {
        setKnowledgeBankError(
          error instanceof Error
            ? error.message
            : "Unable to load Knowledge Bank."
        );
      }
    } finally {
      if (!cancelled) {
        setKnowledgeBankLoading(false);
      }
    }
  };

  loadKnowledgeBank();

  return () => {
    cancelled = true;
  };
}, [knowledgeBankOpen, token]);



// Save text-based or document-based Knowledge Bank material.
const handleSaveKnowledgeBankMaterial = async () => {
  if (!token) {
    setKnowledgeBankMessage("Session expired. Please log in again.");
    return;
  }

  if (!newMaterialTitle.trim()) {
    setKnowledgeBankMessage("Please enter a material title.");
    return;
  }

  if (!newMaterialContent.trim() && !newMaterialFile) {
    setKnowledgeBankMessage(
      "Please enter material content or select a document."
    );
    return;
  }

  if (newMaterialFile && newMaterialFile.size > 10 * 1024 * 1024) {
    setKnowledgeBankMessage("File size must not exceed 10 MB.");
    return;
  }

  setSavingKnowledgeBank(true);
  setKnowledgeBankMessage("");

  try {
    let res: Response;

    if (newMaterialFile) {
      // Upload PDF, DOC or DOCX document.
      const formData = new FormData();

      formData.append("file", newMaterialFile);
      formData.append("title", newMaterialTitle.trim());
      formData.append("category", newMaterialCategory);

      res = await fetch(
        `${API_BASE_URL}/api/knowledge-bank/upload`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
          },
          body: formData,
        }
      );
    } else {
      // Preserve the existing text-material API.
      res = await fetch(`${API_BASE_URL}/api/knowledge-bank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          title: newMaterialTitle.trim(),
          category: newMaterialCategory,
          content: newMaterialContent.trim(),
        }),
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = errorText || "Unable to save material.";

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Keep the original response text.
      }

      throw new Error(errorMessage);
    }

    const savedItem: KnowledgeBankItem = await res.json();

    setKnowledgeBankItems((previous) =>
      [...previous, savedItem].sort((a, b) =>
        a.title.localeCompare(b.title)
      )
    );

    setNewMaterialTitle("");
    setNewMaterialContent("");
    setNewMaterialCategory("calling-scripts");
    setNewMaterialFile(null);
    setShowKnowledgeBankForm(false);

    setKnowledgeBankMessage(
      newMaterialFile
        ? "Document uploaded successfully."
        : "Material saved successfully."
    );
  } catch (error) {
    setKnowledgeBankMessage(
      error instanceof Error
        ? error.message
        : "Failed to save material."
    );
  } finally {
    setSavingKnowledgeBank(false);
  }
};



// Delete a Knowledge Bank material owned by the logged-in agent.
const handleDeleteKnowledgeBankMaterial = async (item: KnowledgeBankItem) => {
  if (!token) {
    setKnowledgeBankMessage("Session expired. Please log in again.");
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete "${item.title}"?`
  );

  if (!confirmed) return;

  setKnowledgeBankMessage("");

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/knowledge-bank/${item.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    if (!res.ok) {
      throw new Error(
        await res.text() || "Unable to delete material."
      );
    }

    setKnowledgeBankItems((previous) =>
      previous.filter((savedItem) => savedItem.id !== item.id)
    );

    setKnowledgeBankMessage("Material deleted successfully.");
  } catch (error) {
    setKnowledgeBankMessage(
      error instanceof Error
        ? error.message
        : "Failed to delete material."
    );
  }
};





// PASTE THE NEW VIEW FUNCTION HERE
const handleViewKnowledgeBankDocument = async (item: KnowledgeBankItem) => {
  if (!token) {
    setKnowledgeBankMessage("Session expired. Please log in again.");
    return;
  }

  const newTab = window.open("about:blank", "_blank");

  if (!newTab) {
    setKnowledgeBankMessage("Please allow popups to view documents.");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/knowledge-bank/${item.id}/view`,
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    if (!res.ok) {
      throw new Error(await res.text() || "Unable to open document.");
    }

    const data: { signedUrl: string; fileName: string } = await res.json();

    if (!data.signedUrl) {
      throw new Error("Document URL was not returned by the server.");
    }

    newTab.location.href = data.signedUrl;
  } catch (error) {
    newTab.close();
    setKnowledgeBankMessage(
      error instanceof Error ? error.message : "Unable to open document."
    );
  }
};




  // Record today's lead view for the logged-in agent.

  const recordLeadView = useCallback(async () => {

  if (!leadId || !token) return;



  if (typeof window === "undefined") return;



  const userRole = (

    localStorage.getItem("userRole") ||

    localStorage.getItem("role") ||

    ""

  ).toUpperCase();



  if (userRole !== "AGENT") return;



    try {

      const res = await fetch(

        `${API_BASE_URL}/api/lead-views/${leadId}`,

        {

          method: "POST",

          headers: {

            Authorization: "Bearer " + token,

          },

        }

      );



      if (!res.ok) {

        console.error(

          "Failed to record lead view:",

          res.status,

          await res.text()

        );

      }

    } catch (error) {

      console.error("Error recording lead view:", error);

    }

  }, [leadId, token]);





  const loadLead = useCallback(async () => {

    if (!leadId || !token) return;

    try {

      const res = await fetch(
  `${API_BASE_URL}/api/leads/${leadId}?includeClosedHistory=true`,
  {

        headers: { Authorization: "Bearer " + token },

      });

      if (!res.ok) throw new Error("Failed to load lead");

      const data: Lead = await res.json();

      setLead(data);

      setEditName(data.fullName || "");

      setEditEmail(data.email || "");

      setEditPhone(data.phone || "");

      setEditAge(data.age != null ? String(data.age) : "");

      setEditCity(data.city || "");

      setEditEducation(data.education || "");

      setEditCurrentProfession(data.currentProfession || "");

      setEditPrimaryObjective(data.primaryObjective || "");

      setEditTradingExperience(data.tradingInvestmentExperience || "");

      setEditCustomerLookingFor(data.customerLookingFor || "");

      setEditInterestedArea(data.interestedArea || "");

      setEditStatus(data.status || "NEW");

      setEditPriority(data.priority || "");

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }, [leadId, token]);



  const loadCallLogs = useCallback(async () => {

    if (!leadId || !token) return;

    try {

      const res = await fetch(`${API_BASE_URL}/api/call-logs/lead/${leadId}`, {

        headers: { Authorization: "Bearer " + token },

      });

      if (res.ok) {

        const data: CallLog[] = await res.json();

        setCallLogs(data);

      }

    } catch (err) {

      console.error(err);

    } finally {

      setCallLogsLoading(false);

    }

  }, [leadId, token]);



  const loadFollowUps = useCallback(async () => {

    if (!leadId || !token) return;

    try {

      const res = await fetch(`${API_BASE_URL}/api/follow-ups/lead/${leadId}`, {

        headers: { Authorization: "Bearer " + token },

      });

      if (res.ok) {

        const data: FollowUp[] = await res.json();

        setFollowUps(data);

      }

    } catch (err) {

      console.error(err);

    } finally {

      setFollowUpsLoading(false);

    }

  }, [leadId, token]);



  const loadNotes = useCallback(async () => {

    if (!leadId || !token) return;

    try {

      // Only this lead's notes (same result as filtering /api/notes, without downloading every note).

      const res = await fetch(`${API_BASE_URL}/api/notes/lead/${leadId}`, {

        headers: { Authorization: "Bearer " + token },

      });

      if (res.ok) {

        const allNotes: Note[] = await res.json();

        const filtered = allNotes.filter((n) => String(n.leadId) === String(leadId));

        setNotes(filtered);

      }

    } catch (err) {

      console.error(err);

    } finally {

      setNotesLoading(false);

    }

  }, [leadId, token]);





  // Move the current lead to the end of this agent's queue, then open

  // the first remaining lead. Viewing a lead alone does not rotate the queue.

  const goToNextLead = useCallback(() => {

    if (typeof window === "undefined") return;



    try {

      const userId = window.localStorage.getItem("userId") || "current-user";

      const queueKey = `derivion_lead_queue_${userId}`;

      const stored = window.localStorage.getItem(queueKey);

      const parsed: unknown = stored ? JSON.parse(stored) : [];

      const queue: number[] = Array.isArray(parsed)

        ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id))

        : [];



      if (!leadId || queue.length === 0) {

        router.push("/leads");

        return;

      }



      const currentId = Number(leadId);

      const currentIndex = queue.findIndex((id) => id === currentId);

      if (currentIndex === -1) {

        // If this lead is not in the saved queue, leave the queue unchanged.

        const nextLeadId = queue.find((id) => id !== currentId);

        if (nextLeadId == null) {

          router.push("/leads");

          return;

        }

        router.push(`/lead-details?id=${nextLeadId}`);

        return;

      }



      const nextQueue = queue.filter((id) => id !== currentId);

      if (nextQueue.length === 0) {

        window.localStorage.setItem(queueKey, JSON.stringify([currentId]));

        router.push("/leads");

        return;

      }



      // The current lead is now at the end; the first remaining ID is next.

      nextQueue.push(currentId);

      window.localStorage.setItem(queueKey, JSON.stringify(nextQueue));

      router.push(`/lead-details?id=${nextQueue[0]}`);

    } catch (error) {

      console.error("Unable to move to next lead:", error);

      router.push("/leads");

    }

  }, [leadId, router]);





  useEffect(() => {

    if (!token) {

      router.replace("/");

      return;

    }



    loadLead();

    recordLeadView();

    loadCallLogs();

    loadFollowUps();

    loadNotes();

  }, [

    token,

    router,

    loadLead,

    recordLeadView,

    loadCallLogs,

    loadFollowUps,

    loadNotes,

  ]);





  const handleSaveDetails = async () => {

    if (!leadId || !token) return;



    if (!editName.trim()) {

      setSaveMessage({ text: "Full name is required.", isError: true });

      return;

    }



    if (!editPhone.trim()) {

      setSaveMessage({ text: "Phone number is required.", isError: true });

      return;

    }



    if (!/^\+?[0-9]{10,15}$/.test(editPhone.trim())) {

      setSaveMessage({ text: "Phone number must contain 10 to 15 digits.", isError: true });

      return;

    }



    const ageNum = editAge ? Number(editAge) : null;

    if (ageNum !== null && (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {

      setSaveMessage({ text: "Age must be between 1 and 120.", isError: true });

      return;

    }



    const body = {

      fullName: editName.trim(),

      email: editEmail.trim() || null,

      // Phone is displayed read-only; preserve the value loaded from the lead.

      phone: lead?.phone || editPhone.trim(),

      age: ageNum,

      city: editCity.trim() || null,

      education: editEducation.trim() || null,

      currentProfession: editCurrentProfession.trim() || null,

      primaryObjective: editPrimaryObjective.trim() || null,

      tradingInvestmentExperience: editTradingExperience.trim() || null,

      customerLookingFor: editCustomerLookingFor.trim() || null,

      interestedArea: editInterestedArea.trim() || null,

      priority: editPriority || null,

      status: editStatus || null,

    };



    setSaving(true);

    setSaveMessage(null);



    try {

      const res = await fetch(`${API_BASE_URL}/api/agent/leads/${leadId}/details`, {

        method: "PUT",

        headers: {

          "Content-Type": "application/json",

          Authorization: "Bearer " + token,

        },

        body: JSON.stringify(body),

      });



      const responseText = await res.text();

      if (!res.ok) {

        throw new Error(responseText || "Failed to update lead details");

      }



      const updatedLead: Lead = responseText ? JSON.parse(responseText) : body;

      setLead((prev) => ({ ...prev, ...updatedLead }));

      setSaveMessage({ text: "Lead details updated successfully. Opening next lead...", isError: false });

      // Advance only after the backend confirms the save succeeded.

      window.setTimeout(() => goToNextLead(), 350);

    } catch (err: unknown) {

      const message = err instanceof Error ? err.message : "Failed to update lead details.";

      setSaveMessage({ text: message, isError: true });

    } finally {

      setSaving(false);

    }

  };



  // Transfer lead handlers

  const openTransferModal = async () => {

    setTransferOpen(true);

    setTransferMessage(null);

    setSelectedTeamId("");

    setSelectedAgentId("");

    setAgents([]);



    try {

      const res = await fetch(`${API_BASE_URL}/api/teams`, {

        headers: { Authorization: "Bearer " + token },

      });

      if (res.ok) {

        const teamsData: Team[] = await res.json();

        setTeams(teamsData.filter((t) => !t.status || String(t.status).toUpperCase() === "ACTIVE"));

      }

    } catch (err) {

      console.error(err);

    }

  };



  const handleTeamChange = async (teamId: string) => {

    setSelectedTeamId(teamId);

    setSelectedAgentId("");

    if (!teamId) {

      setAgents([]);

      return;

    }



    try {

      const res = await fetch(`${API_BASE_URL}/api/users`, {

        headers: { Authorization: "Bearer " + token },

      });

      if (res.ok) {

        const users: User[] = await res.json();

        const currentUserId = localStorage.getItem("userId");



        const activeAgents = users.filter(

          (u) =>

            String(u.role).toUpperCase() === "AGENT" &&

            (!u.status || String(u.status).toUpperCase() === "ACTIVE") &&

            String(u.id) !== String(currentUserId)

        );



        setAgents(activeAgents);

      }

    } catch (err) {

      console.error(err);

    }

  };



  const confirmTransfer = async () => {

    const currentUserId = localStorage.getItem("userId");



    if (

      currentUserId &&

      String(selectedAgentId) === String(currentUserId)

    ) {

      setTransferMessage({

        text: "You cannot transfer a lead to yourself. Please select another agent.",

        isError: true,

      });

      return;

    }

    if (!selectedTeamId) {

      setTransferMessage({ text: "Please select the team.", isError: true });

      return;

    }

    if (!selectedAgentId) {

      setTransferMessage({ text: "Please select the agent.", isError: true });

      return;

    }



    if (!window.confirm("Are you sure you want to transfer this lead to the selected team and agent?")) {

      return;

    }



    setTransferring(true);

    setTransferMessage(null);



    try {

      const res = await fetch(`${API_BASE_URL}/api/lead-assignments/${leadId}/reassign`, {

        method: "PUT",

        headers: {

          "Content-Type": "application/json",

          Authorization: "Bearer " + token,

        },

        body: JSON.stringify({

          newAgentId: Number(selectedAgentId),

          newTeamId: Number(selectedTeamId),

        }),

      });



      if (!res.ok) {

        const errText = await res.text();

        throw new Error(errText || "Failed to transfer lead");

      }



      setTransferMessage({ text: "Lead transferred successfully.", isError: false });

      setTimeout(() => {

        setTransferOpen(false);

        loadLead();

      }, 1200);

    } catch (err: unknown) {

      const msg = err instanceof Error ? err.message : "Failed to transfer lead";

      setTransferMessage({ text: msg, isError: true });

    } finally {

      setTransferring(false);

    }

  };











  // WhatsApp click-to-chat supports this CRM's 10-digit Indian phone numbers.

  const whatsappLocalNumber = (editPhone || "").replace(/\D/g, "");

  
const normalizedWhatsappNumber =
  whatsappLocalNumber.length === 12 && whatsappLocalNumber.startsWith("91")
    ? whatsappLocalNumber.slice(2)
    : whatsappLocalNumber;

const whatsappNumber = /^[6-9]\d{9}$/.test(normalizedWhatsappNumber)
  ? `91${normalizedWhatsappNumber}`
  : "";


  const whatsappMessage = `Hi ${lead?.fullName || "there"}, I'm contacting you from ISFT regarding your course enquiry.`;



  if (loading) {

    return (

      <DashboardLayout activeMenu="leads" title="Lead Details">

        <div className="p-8 text-center text-gray-400">Loading lead details...</div>

      </DashboardLayout>

    );

  }



  return (

    <DashboardLayout activeMenu="leads">

      <div className="space-y-3">

        {/* PAGE HEADER */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

          <div>

            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Lead #{lead?.id} Details</h1>

            <p className="text-sm text-gray-500 mt-0.5">View and update complete information about this lead.</p>

          </div>



          <div className="flex items-center gap-3">

            <button
  type="button"
  onClick={() => setKnowledgeBankOpen(true)}
  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
>
  📚 Knowledge Bank
</button>

            <button

              type="button"

              onClick={openTransferModal}

              className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors"

            >

              &#8644; Transfer Lead

            </button>



            <button

              type="button"

              onClick={() => router.push("/leads")}

              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"

            >

              &larr; Back to Leads

            </button>

          </div>

        </div>



        {/* TWO COLUMN LAYOUT */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* LEFT COLUMN: EDITABLE DETAILS + CALL HISTORY */}

          <div className="lg:col-span-7 space-y-4">

            {/* LEAD DETAILS CARD */}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">

                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Lead Profile</h3>

              </div>



              <div className="divide-y divide-gray-100 text-sm">

                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Lead ID</span>

                  <span className="sm:col-span-2 font-bold text-gray-900">{lead?.id ?? "-"}</span>

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Full Name</span>

                  <input

                    type="text"

                    value={editName}

                    onChange={(e) => setEditName(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Email</span>

                  <input

                    type="email"

                    value={editEmail}

                    onChange={(e) => setEditEmail(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Phone</span>

                  <input

                    type="text"

                    value={editPhone}

                    readOnly

                    aria-label="Phone number (read-only)"

                    inputMode="tel"

                    autoComplete="tel"

                    title="Phone number cannot be edited"

                    className="sm:col-span-2 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-base font-bold tracking-wide text-gray-700 bg-gray-100 cursor-not-allowed focus:outline-none"

                  />

                  {editPhone.trim() && (

                    <div className="sm:col-start-2 sm:col-span-2 -mt-1 flex flex-wrap items-center gap-2">

                      <a

                        href={`tel:${editPhone.trim().replace(/[^+0-9]/g, "")}`}

                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"

                      >

                        &#9742; Call {editPhone.trim()}

                      </a>

                      {whatsappNumber ? (
                        <a
                          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                            personalizeMessage(whatsappTemplate)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1DA851]"
                          aria-label={`Open WhatsApp chat with ${lead?.fullName || "this lead"}`}
                        >
                          <span aria-hidden="true">☏</span> WhatsApp
                        </a>
                      ) : (
                        <span
                          className="text-xs font-medium text-amber-700"
                          title="WhatsApp requires a 10-digit Indian mobile number."
                        >
                          WhatsApp unavailable: number must contain exactly 10 digits.
                        </span>
                      )}

                      {editEmail.trim() ? (
                        <a
                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                            editEmail.trim()
                          )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
                            personalizeMessage(emailTemplate)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                          aria-label={`Create email to ${editEmail.trim()}`}
                        >
                          ✉ Email
                        </a>
                      ) : (
                        <span className="text-xs text-amber-700">
                          Email unavailable: no email address.
                        </span>
                      )}
                    </div>

                  )}

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Age</span>

                  <input

                    type="number"

                    value={editAge}

                    min={1}

                    max={120}

                    onChange={(e) => setEditAge(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Course</span>

                  <span className="sm:col-span-2 text-gray-800 flex items-center gap-2">

                    {lead?.courseInterested || "-"}

                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-500">Protected</span>

                  </span>

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Lead Source</span>

                  <span className="sm:col-span-2 text-gray-800 flex items-center gap-2">

                    {lead?.leadSource || "-"}

                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-500">Protected</span>

                  </span>

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Status</span>

                  <select

                    value={editStatus}

                    onChange={(e) => setEditStatus(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"

                  >

                    <option value="NEW">NEW</option>



                    <option value="CONNECTED">CONNECTED</option>

                    <option value="NOT_CONNECTED">NOT_CONNECTED</option>



                    <option value="CONTACTED">CONTACTED</option>

                    <option value="INTERESTED">INTERESTED</option>

                    <option value="FOLLOW_UP">FOLLOW_UP</option>

                    <option value="COUNSELLING">COUNSELLING</option>

                    <option value="ENROLLED">ENROLLED</option>

                    <option value="NOT_INTERESTED">NOT_INTERESTED</option>

                    <option value="WRONG_NUMBER">WRONG_NUMBER</option>

                    <option value="NO_RESPONSE">NO_RESPONSE</option>

                    <option value="LOST">LOST</option>

                  </select>

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Priority</span>

                  <select

                    value={editPriority}

                    onChange={(e) => setEditPriority(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  >

                    <option value="">Select Priority</option>

                    <option value="LOW">LOW</option>

                    <option value="MEDIUM">MEDIUM</option>

                    <option value="HIGH">HIGH</option>

                  </select>

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">City</span>

                  <input

                    type="text"

                    value={editCity}

                    onChange={(e) => setEditCity(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Education</span>

                  <input

                    type="text"

                    value={editEducation}

                    onChange={(e) => setEditEducation(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Current Profession</span>

                  <input

                    type="text"

                    value={editCurrentProfession}

                    onChange={(e) => setEditCurrentProfession(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Primary Objective</span>

                  <input

                    type="text"

                    value={editPrimaryObjective}

                    onChange={(e) => setEditPrimaryObjective(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Trading Experience</span>

                  <input

                    type="text"

                    value={editTradingExperience}

                    onChange={(e) => setEditTradingExperience(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Customer Looking For</span>

                  <input

                    type="text"

                    value={editCustomerLookingFor}

                    onChange={(e) => setEditCustomerLookingFor(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>



                <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-3 items-center gap-2">

                  <span className="font-semibold text-gray-600">Interested Area</span>

                  <input

                    type="text"

                    value={editInterestedArea}

                    onChange={(e) => setEditInterestedArea(e.target.value)}

                    className="sm:col-span-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                  />

                </div>

              </div>



              {/* SAVE BUTTON */}

              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2">

                <button

                  type="button"

                  disabled={saving}

                  onClick={handleSaveDetails}

                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"

                >

                  {saving ? "Saving..." : "Save & Next Lead"}

                </button>



                <button

                  type="button"

                  disabled={saving}

                  onClick={goToNextLead}

                  className="px-4 py-2 text-sm font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 disabled:opacity-50 rounded-lg shadow-sm transition-colors"

                >

                  Next Lead &#8594;

                </button>



                {saveMessage && (

                  <span className={`text-xs font-semibold ${saveMessage.isError ? "text-red-600" : "text-green-600"}`}>

                    {saveMessage.text}

                  </span>

                )}

              </div>

            </div>



            {/* CALL HISTORY */}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-3">

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">

                <div>

                  <h3 className="text-base font-bold text-gray-900">Call History</h3>

                  <p className="text-xs text-gray-500 mt-0.5">All calls logged for this lead.</p>

                </div>

                <button

                  type="button"

                  onClick={() => router.push(`/add-call-log?leadId=${leadId}`)}

                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"

                >

                  + Add Call

                </button>

              </div>



              <div className="space-y-3">

                {callLogsLoading ? (

                  <p className="text-sm text-gray-400 py-4 text-center">Loading call history...</p>

                ) : callLogs.length === 0 ? (

                  <p className="text-sm text-gray-400 py-4 text-center">No call history available for this lead.</p>

                ) : (

                  callLogs.map((call) => (

                    <div key={call.id} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1.5">

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Call ID:</span>

                        <span className="font-bold text-gray-900">#{call.id}</span>

                      </div>

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Agent ID:</span>

                        <span className="text-gray-800">{call.agentId ?? "-"}</span>

                      </div>

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Status:</span>

                        <span className="font-medium text-blue-600">{call.callStatus ?? "-"}</span>

                      </div>

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Outcome:</span>

                        <span className="font-medium text-emerald-600">{call.outcome ?? "-"}</span>

                      </div>

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Duration:</span>

                        <span className="text-gray-800">{call.duration ?? "-"} sec</span>

                      </div>

                      {call.remarks && (

                        <div className="pt-1 border-t border-gray-200/60 mt-1">

                          <span className="font-semibold text-gray-600">Remarks:</span>

                          <p className="text-gray-800 mt-0.5">{call.remarks}</p>

                        </div>

                      )}

                    </div>

                  ))

                )}

              </div>

            </div>

          </div>



          {/* RIGHT COLUMN: FOLLOW-UPS + NOTES */}

          <div className="lg:col-span-5 space-y-4">

            {/* FOLLOW-UP HISTORY */}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-3">

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">

                <div>

                  <h3 className="text-base font-bold text-gray-900">Follow-up History</h3>

                  <p className="text-xs text-gray-500 mt-0.5">Scheduled follow-up interactions.</p>

                </div>

                <button

                  type="button"

                  onClick={() => router.push(`/add-follow-up?leadId=${leadId}`)}

                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"

                >

                  + Add Follow-up

                </button>

              </div>



              <div className="space-y-3">

                {followUpsLoading ? (

                  <p className="text-sm text-gray-400 py-4 text-center">Loading follow-ups...</p>

                ) : followUps.length === 0 ? (

                  <p className="text-sm text-gray-400 py-4 text-center">No follow-ups scheduled for this lead.</p>

                ) : (

                  followUps.map((fu) => (

                    <div key={fu.id} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1.5">

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Follow-up ID:</span>

                        <span className="font-bold text-gray-900">#{fu.id}</span>

                      </div>

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Date:</span>

                        <span className="font-medium text-gray-800">{fu.followUpDate ?? "-"}</span>

                      </div>

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Purpose:</span>

                        <span className="text-gray-800">{fu.purpose ?? "-"}</span>

                      </div>

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Status:</span>

                        <span className={`font-semibold px-2 py-0.5 rounded-full ${fu.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"

                          }`}>

                          {fu.status ?? "-"}

                        </span>

                      </div>

                      {fu.remarks && (

                        <div className="pt-1 border-t border-gray-200/60 mt-1">

                          <span className="font-semibold text-gray-600">Remarks:</span>

                          <p className="text-gray-800 mt-0.5">{fu.remarks}</p>

                        </div>

                      )}

                    </div>

                  ))

                )}

              </div>

            </div>



            {/* NOTES */}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-3">

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">

                <div>

                  <h3 className="text-base font-bold text-gray-900">Notes</h3>

                  <p className="text-xs text-gray-500 mt-0.5">Team notes and remarks on this lead.</p>

                </div>

                <button

                  type="button"

                  onClick={() => router.push(`/add-note?leadId=${leadId}`)}

                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"

                >

                  + Add Note

                </button>

              </div>



              <div className="space-y-3">

                {notesLoading ? (

                  <p className="text-sm text-gray-400 py-4 text-center">Loading notes...</p>

                ) : notes.length === 0 ? (

                  <p className="text-sm text-gray-400 py-4 text-center">No notes available for this lead.</p>

                ) : (

                  notes.map((n) => (

                    <div key={n.id} className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1.5">

                      <div className="flex justify-between">

                        <span className="font-semibold text-gray-600">Note ID: #{n.id}</span>

                        <span className="text-gray-400">User ID: {n.userId ?? "-"}</span>

                      </div>

                      <p className="text-gray-800 text-sm whitespace-pre-wrap mt-1">{n.note ?? "-"}</p>

                    </div>

                  ))

                )}

              </div>

            </div>

          </div>

        </div>



        {/* TRANSFER MODAL */}

        {transferOpen && (

          <div

            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"

            onClick={(e) => {

              if (e.target === e.currentTarget) setTransferOpen(false);

            }}

          >

            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">

              <div>

                <h3 className="text-lg font-bold text-gray-900">Transfer Lead</h3>

                <p className="text-xs text-gray-500 mt-1">

                  Transfer this lead to another product team and agent.

                </p>

              </div>



              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">

                <div className="flex justify-between">

                  <span className="text-gray-500">Lead ID:</span>

                  <span className="font-bold text-gray-900">#{leadId}</span>

                </div>

                <div className="flex justify-between">

                  <span className="text-gray-500">Lead Name:</span>

                  <span className="font-bold text-gray-900">{lead?.fullName || "-"}</span>

                </div>

              </div>



              <div className="space-y-4">

                <div>

                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">

                    Transfer To Team \*

                  </label>

                  <select

                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                    value={selectedTeamId}

                    onChange={(e) => handleTeamChange(e.target.value)}

                  >

                    <option value="">Select team</option>

                    {teams.map((t) => (

                      <option key={t.id} value={t.id}>

                        {t.name || t.teamName || t.title || `Team ${t.id}`} (ID: {t.id})

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">

                    Transfer To Agent \*

                  </label>

                  <select

                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"

                    value={selectedAgentId}

                    onChange={(e) => setSelectedAgentId(e.target.value)}

                  >

                    <option value="">{selectedTeamId ? "Select agent" : "Select team first"}</option>

                    {agents.map((a) => (

                      <option key={a.id} value={a.id}>

                        {a.fullName || a.name || a.username || `Agent ${a.id}`} (ID: {a.id})

                      </option>

                    ))}

                  </select>

                </div>

              </div>



              {transferMessage && (

                <div

                  className={`text-xs font-semibold ${transferMessage.isError ? "text-red-600" : "text-green-600"

                    }`}

                >

                  {transferMessage.text}

                </div>

              )}



              <div className="flex justify-end gap-3 pt-2">

                <button

                  type="button"

                  onClick={() => setTransferOpen(false)}

                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"

                >

                  Cancel

                </button>

                <button

                  type="button"

                  disabled={transferring}

                  onClick={confirmTransfer}

                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"

                >

                  {transferring ? "Transferring..." : "Transfer Lead"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* KNOWLEDGE BANK POPUP */}
{knowledgeBankOpen && (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setKnowledgeBankOpen(false);
      }
    }}
  >
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            📚 Knowledge Bank
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your personal calling scripts, course information and documents
          </p>
        </div>

        <button
          type="button"
          onClick={() => setKnowledgeBankOpen(false)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white"
          aria-label="Close Knowledge Bank"
        >
          ✕ Close
        </button>
      </div>

      {/* Search and actions */}
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search scripts, courses and documents..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:max-w-md"
          disabled
        />

        <button
  type="button"
  onClick={() => {
    setShowKnowledgeBankForm((previous) => !previous);
    setKnowledgeBankMessage("");
  }}
  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
>
  {showKnowledgeBankForm ? "Cancel" : "+ Add Material"}
</button>
      </div>

      {/* Add Material Form */}
{showKnowledgeBankForm && (
  <div className="border-b border-slate-200 bg-blue-50/50 p-5">
    <h3 className="mb-4 text-base font-bold text-slate-900">
      Add New Material
    </h3>

    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Material Title *
        </label>

        <input
          type="text"
          value={newMaterialTitle}
          onChange={(e) => setNewMaterialTitle(e.target.value)}
          placeholder="Enter material title"
          maxLength={200}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Category *
        </label>

        <select
          value={newMaterialCategory}
          onChange={(e) => setNewMaterialCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="calling-scripts">Calling Scripts</option>
          <option value="course-information">Course Information</option>
          <option value="brochures-documents">Brochures & Documents</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Material Content *
        </label>

        <textarea
          value={newMaterialContent}
          onChange={(e) => setNewMaterialContent(e.target.value)}
          placeholder="Write or paste your calling script, course information or other material..."
          rows={6}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div>
  <label className="mb-1 block text-sm font-semibold text-slate-700">
    Upload PDF or Word Document (Optional)
  </label>

  <input
    type="file"
    accept=".pdf,.doc,.docx"
    onChange={(e) =>
      setNewMaterialFile(e.target.files?.[0] || null)
    }
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
  />

  <p className="mt-1 text-xs text-slate-500">
    Supported formats: PDF, DOC and DOCX. Maximum size: 10 MB.
  </p>

  {newMaterialFile && (
    <p className="mt-2 text-sm text-green-700">
      Selected: {newMaterialFile.name}
    </p>
  )}
</div>
      </div>

      {knowledgeBankMessage && (
        <p className="text-sm font-medium text-red-600">
          {knowledgeBankMessage}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setShowKnowledgeBankForm(false);
            setKnowledgeBankMessage("");
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSaveKnowledgeBankMaterial}
          disabled={savingKnowledgeBank}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {savingKnowledgeBank ? "Saving..." : "Save Material"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Categories */}
      

{/* Knowledge Bank Categories */}
<div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">

  {/* Calling Scripts */}
  <button
    type="button"
    onClick={() => {
      setSelectedKnowledgeBankCategory("calling-scripts");
      setKnowledgeBankMessage("");
    }}
    className={`rounded-xl border p-4 text-left transition hover:shadow-md ${
      selectedKnowledgeBankCategory === "calling-scripts"
        ? "border-blue-500 bg-blue-100 ring-2 ring-blue-200"
        : "border-blue-100 bg-blue-50 hover:border-blue-400"
    }`}
  >
    <div className="text-2xl">💬</div>
    <h3 className="mt-2 font-bold text-slate-900">
      Calling Scripts
    </h3>
    <p className="mt-1 text-sm text-slate-600">
      Calling scripts, objection handling and follow-ups.
    </p>
    <p className="mt-2 text-xs font-semibold text-blue-700">
      {knowledgeBankItems.filter(
        (item) => item.category === "calling-scripts"
      ).length} materials · Open →
    </p>
  </button>

  {/* Brochures & Documents */}
  <button
    type="button"
    onClick={() => {
      setSelectedKnowledgeBankCategory("brochures-documents");
      setKnowledgeBankMessage("");
    }}
    className={`rounded-xl border p-4 text-left transition hover:shadow-md ${
      selectedKnowledgeBankCategory === "brochures-documents"
        ? "border-amber-500 bg-amber-100 ring-2 ring-amber-200"
        : "border-amber-100 bg-amber-50 hover:border-amber-400"
    }`}
  >
    <div className="text-2xl">📄</div>
    <h3 className="mt-2 font-bold text-slate-900">
      Brochures & Documents
    </h3>
    <p className="mt-1 text-sm text-slate-600">
      PDF brochures and Word documents.
    </p>
    <p className="mt-2 text-xs font-semibold text-amber-700">
      {knowledgeBankItems.filter(
        (item) =>
          item.category === "brochures-documents" && item.fileName
      ).length} documents · Open →
    </p>
  </button>

  {/* Course Information */}
  <button
    type="button"
    onClick={() => {
      setSelectedKnowledgeBankCategory("course-information");
      setKnowledgeBankMessage("");
    }}
    className={`rounded-xl border p-4 text-left transition hover:shadow-md ${
      selectedKnowledgeBankCategory === "course-information"
        ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-200"
        : "border-emerald-100 bg-emerald-50 hover:border-emerald-400"
    }`}
  >
    <div className="text-2xl">🎓</div>
    <h3 className="mt-2 font-bold text-slate-900">
      Course Information
    </h3>
    <p className="mt-1 text-sm text-slate-600">
      Course details, fees, duration and eligibility.
    </p>
    <p className="mt-2 text-xs font-semibold text-emerald-700">
      {knowledgeBankItems.filter(
        (item) => item.category === "course-information"
      ).length} materials · Open →
    </p>
  </button>

</div>



      {/* Saved Knowledge Bank Materials */}
<div className="border-t border-slate-200 bg-white p-5">

  {knowledgeBankLoading ? (
    <p className="py-6 text-center text-sm text-gray-500">
      Loading your materials...
    </p>
  ) : knowledgeBankError ? (
    <p className="py-6 text-center text-sm font-medium text-red-600">
      {knowledgeBankError}
    </p>
  ) : filteredKnowledgeBankItems.length === 0 ? (
    <div className="py-6 text-center">
      <div className="text-4xl">📂</div>
      <h3 className="mt-3 font-semibold text-slate-800">
        Your Knowledge Bank is empty
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Add your personal calling scripts, course information and documents.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-800">
        Your Saved Materials ({filteredKnowledgeBankItems.length})
      </h3>

      {filteredKnowledgeBankItems.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-slate-200 p-4"
        >
          <div className="flex items-start justify-between gap-3">
  <div className="font-semibold text-slate-900">
    {item.title}
  </div>

  <button
    type="button"
    onClick={() => handleDeleteKnowledgeBankMaterial(item)}
    className="shrink-0 rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
  >
    Delete
  </button>
</div>

          <div className="mt-1 text-xs text-blue-600">
            {item.category.replace(/-/g, " ")}
          </div>

          
{item.fileName && (
  <div className="mt-3 flex flex-wrap items-center gap-3">
    <span className="text-xs text-slate-500">
      📄 {item.fileName}
    </span>

    <button
      type="button"
      onClick={() => handleViewKnowledgeBankDocument(item)}
      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
    >
      👁 View Document
    </button>
  </div>
)}

{item.content && (
  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
    {item.content}
  </p>
)}

        </div>
      ))}
    </div>
  )}

</div>
      {/* Footer */}
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4">
        <button
          type="button"
          onClick={() => setKnowledgeBankOpen(false)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}

        {/* PERSONAL OUTREACH TEMPLATES */}
        <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowOutreachTemplates((visible) => !visible)}
            aria-expanded={showOutreachTemplates}
            className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
          >
            <span>
              <span className="block text-sm font-bold text-slate-900">Outreach Templates</span>
              <span className="mt-1 block text-xs text-slate-500">
                Manage your saved WhatsApp greeting and email message
              </span>
            </span>
            <span className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              {showOutreachTemplates ? "Hide Templates ▲" : "Edit Templates ▼"}
            </span>
          </button>
          {showOutreachTemplates && (
            <div className="border-t border-slate-200 p-4">
              <p className="mb-3 text-xs text-slate-500">
                Signed in as {agentName}. Use {"{name}"} for the lead&apos;s name and {"{agentName}"} for your name.
                These templates are saved for your account on this browser.
              </p>
              <label className="mb-1 block text-xs font-semibold text-slate-700">WhatsApp greeting</label>
              <textarea value={whatsappTemplate} onChange={(e) => setWhatsappTemplate(e.target.value)} rows={3}
                className="mb-3 w-full rounded-lg border border-slate-300 p-2 text-sm" />
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email subject</label>
              <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                className="mb-3 w-full rounded-lg border border-slate-300 p-2 text-sm" />
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email greeting and message</label>
              <textarea value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} rows={5}
                className="mb-3 w-full rounded-lg border border-slate-300 p-2 text-sm" />
              <button type="button" onClick={saveOutreachTemplates}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Save My Templates
              </button>
              {saveMessage && (
                <p className={`mt-2 text-xs font-semibold ${saveMessage.isError ? "text-red-600" : "text-green-600"}`}>
                  {saveMessage.text}
                </p>
              )}
            </div>
          )}
        </section>

      </div>

    </DashboardLayout>

  );

}



export default function LeadDetailsPage() {

  return (

    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading lead details...</div>}>

      <LeadDetailsContent />

    </Suspense>

  );

}
