"use client";

import { create } from "zustand";
import type { ExpansionRequest, ExpansionStatus } from "@/types";
import { isDemoMode as checkDemoMode } from "@/config/env";

/* ------------------------------------------------------------------ */
/*  Expansion State                                                     */
/* ------------------------------------------------------------------ */

interface ExpansionState {
  requests: ExpansionRequest[];
  isLoading: boolean;
  approveRequest: (id: string, approverName: string, approverId: string, notes: string) => void;
  rejectRequest: (id: string, approverName: string, approverId: string, notes: string) => void;
  getPendingCount: () => number;
}

/* ------------------------------------------------------------------ */
/*  Demo placeholder data                                              */
/* ------------------------------------------------------------------ */

const DEMO_REQUESTS: ExpansionRequest[] = [
  {
    id: "exp-001",
    pharmacyId: "pharm-001",
    pharmacyName: "Apotek Sehat",
    ownerId: "owner-001",
    ownerName: "Budi Santoso",
    requestedStoreName: "Apotek Sehat Cabang Cimahi",
    requestedLocation: "Jl. Cimahi No. 123, Bandung",
    reason:
      "Meningkatnya jumlah pelanggan di wilayah Cimahi. Membutuhkan cabang baru untuk memperluas jangkauan layanan.",
    status: "pending",
    approverId: null,
    approverName: null,
    approvalNotes: null,
    createdAt: "2026-05-15T08:30:00Z",
    updatedAt: null,
  },
  {
    id: "exp-002",
    pharmacyId: "pharm-002",
    pharmacyName: "Apotek Keluarga",
    ownerId: "owner-002",
    ownerName: "Siti Rahmawati",
    requestedStoreName: "Apotek Keluarga Cabang Cibeureum",
    requestedLocation: "Jl. Cibeureum Raya No. 45, Tasikmalaya",
    reason:
      "Wilayah Cibeureum belum memiliki apotek yang melayani resep BPJS. Ingin membuka cabang untuk melayani kebutuhan tersebut.",
    status: "approved",
    approverId: "demo-super_admin",
    approverName: "Super Admin",
    approvalNotes: "Lokasi strategis, izin BPJS sudah terdaftar. Disetujui.",
    createdAt: "2026-05-10T10:15:00Z",
    updatedAt: "2026-05-12T14:00:00Z",
  },
  {
    id: "exp-003",
    pharmacyId: "pharm-003",
    pharmacyName: "Apotek 24 Jam",
    ownerId: "owner-003",
    ownerName: "Hendra Wijaya",
    requestedStoreName: "Apotek 24 Jam Cabang Stasiun",
    requestedLocation: "Jl. Stasiun No. 78, Bandung",
    reason:
      "Area sekitar stasiun membutuhkan apotek 24 jam untuk melayani penumpang kereta dan warga sekitar.",
    status: "rejected",
    approverId: "demo-super_admin",
    approverName: "Super Admin",
    approvalNotes:
      "Lokasi terlalu dekat dengan apotek eksisting (Apotek Sehat Cabang Stasiun, 200m). Tidak disetujui.",
    createdAt: "2026-05-08T14:00:00Z",
    updatedAt: "2026-05-11T09:30:00Z",
  },
  {
    id: "exp-004",
    pharmacyId: "pharm-004",
    pharmacyName: "Apotek Medika",
    ownerId: "owner-004",
    ownerName: "Dr. Andi Pratama",
    requestedStoreName: "Apotek Medika Cabang Ujung Berung",
    requestedLocation: "Jl. Ujung Berung No. 56, Bandung",
    reason:
      "Pengembangan jaringan apotek ke wilayah Bandung Timur yang sedang berkembang pesat.",
    status: "pending",
    approverId: null,
    approverName: null,
    approvalNotes: null,
    createdAt: "2026-05-18T07:45:00Z",
    updatedAt: null,
  },
];

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useExpansionStore = create<ExpansionState>()((set, get) => ({
  requests: checkDemoMode() ? DEMO_REQUESTS : [],
  isLoading: false,

  approveRequest: (id, approverName, approverId, notes) =>
    set((state) => ({
      requests: state.requests.map((req) =>
        req.id === id
          ? {
              ...req,
              status: "approved" as ExpansionStatus,
              approverId,
              approverName,
              approvalNotes: notes,
              updatedAt: new Date().toISOString(),
            }
          : req,
      ),
    })),

  rejectRequest: (id, approverName, approverId, notes) =>
    set((state) => ({
      requests: state.requests.map((req) =>
        req.id === id
          ? {
              ...req,
              status: "rejected" as ExpansionStatus,
              approverId,
              approverName,
              approvalNotes: notes,
              updatedAt: new Date().toISOString(),
            }
          : req,
      ),
    })),

  getPendingCount: () =>
    get().requests.filter((r) => r.status === "pending").length,
}));
