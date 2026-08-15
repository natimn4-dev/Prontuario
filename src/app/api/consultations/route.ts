import { createConsultationSafely } from "@/server/clinical/create-consultation";
import { createConsultationPostHandler } from "@/server/clinical/create-consultation-http";

export const POST = createConsultationPostHandler(createConsultationSafely);
