"use client";

import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import SchemaWorkspace from "@/components/SchemaWorkspace";

export default function ContractPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;
  const contractId = params.contractId as Id<"contracts">;

  return <SchemaWorkspace projectId={projectId} contractId={contractId} />;
}
