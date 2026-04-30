import type {
  AdminDesignReviewDto,
  ApproveDesignInput,
  DesignReviewDecisionResult,
  RejectDesignInput,
  RequestRevisionInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface AdminDesignReviewListResponse {
  items: AdminDesignReviewDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AdminDesignReviewsClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminDesignReviewListResponse> {
    const search = new URLSearchParams();
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminDesignReviewListResponse>(
      `/admin/design-reviews${qs ? `?${qs}` : ''}`,
    );
  }

  async get(id: string): Promise<AdminDesignReviewDto> {
    return this.api.request<AdminDesignReviewDto>(
      `/admin/design-reviews/${encodeURIComponent(id)}`,
    );
  }

  async approve(id: string, input: ApproveDesignInput = {}): Promise<DesignReviewDecisionResult> {
    return this.api.request<DesignReviewDecisionResult>(
      `/admin/design-reviews/${encodeURIComponent(id)}/approve`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  async reject(id: string, input: RejectDesignInput): Promise<DesignReviewDecisionResult> {
    return this.api.request<DesignReviewDecisionResult>(
      `/admin/design-reviews/${encodeURIComponent(id)}/reject`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  async requestRevision(
    id: string,
    input: RequestRevisionInput,
  ): Promise<DesignReviewDecisionResult> {
    return this.api.request<DesignReviewDecisionResult>(
      `/admin/design-reviews/${encodeURIComponent(id)}/request-revision`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }
}
