import type { RequestStatus } from "./types";

export const statusTransitions: Record<RequestStatus, RequestStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "NEED_MORE_INFO", "QUOTED", "CANCELLED"],
  UNDER_REVIEW: ["NEED_MORE_INFO", "QUOTED", "IN_PROGRESS", "CANCELLED"],
  NEED_MORE_INFO: ["UNDER_REVIEW", "QUOTED", "CANCELLED"],
  QUOTED: ["IN_PROGRESS", "UNDER_REVIEW", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "NEED_MORE_INFO", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
