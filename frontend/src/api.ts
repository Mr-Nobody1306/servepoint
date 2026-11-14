/**
 * ServePoint Typed API Client
 * Interfaces with ServePoint backend REST API (/api/*)
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "provider" | "artisan" | "admin";
  phone?: string;
  trade?: string;
  area?: string;
  address?: string;
  status?: "active" | "suspended";
  suspended?: boolean;
}

export interface ProviderAvailability {
  acceptingBookings: boolean;
  workingDays: string[];
  workingHours: string;
  emergencyAvailable?: boolean;
}

export interface ProviderService {
  id?: string;
  name: string;
  category?: string;
  price: number;
  billing: "Per hour" | "Fixed price" | string;
  description: string;
}

export interface Provider {
  id: string;
  name: string;
  trade: string;
  category: string;
  rating: number | string;
  jobs: number;
  price: number;
  area: string;
  phone?: string;
  status: "approved" | "pending" | "declined" | "suspended";
  suspended?: boolean;
  initials?: string;
  color?: string;
  image?: string;
  bio?: string;
  services?: ProviderService[];
  availability?: ProviderAvailability;
  documents?: {
    idVerified: boolean;
    insurance: boolean;
    references: number;
  };
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  area?: string;
  address?: string;
  status: "active" | "suspended";
  suspended?: boolean;
  totalBookings: number;
  completedBookingsCount: number;
  grossSpendGhs: number;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceId: string;
  serviceName: string;
  providerId?: string;
  providerName?: string;
  address: string;
  date: string;
  time: string;
  description: string;
  status: "pending" | "confirmed" | "accepted" | "in-progress" | "completed" | "declined" | "rejected" | "cancelled";
  bookingType?: "instant" | "request";
  paymentMethod?: string;
  total: number;
  duration?: string;
  createdAt: string;
  responseNotes?: string;
  history?: Array<{ status: string; changedAt: string; changedBy: string; notes?: string }>;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  active?: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  providerId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PlatformStats {
  grossBookingsGhs: number;
  grossBookingsFormatted: string;
  activeBookings: number;
  activeProviders: number;
  pendingVerifications: number;
  customerCount: number;
  customerHealth: string;
  recentBookings: Booking[];
  verificationQueue: Provider[];
}

const API_BASE = "";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("servepoint_token") || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  async getMe(userId?: string): Promise<{ user: User | null }> {
    return request<{ user: User | null }>(`/api/auth/me${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`);
  },

  async login(payload: { email?: string; password?: string; userId?: string; role?: string; name?: string; phone?: string }): Promise<{ ok: boolean; user: User; token: string }> {
    const res = await request<{ ok: boolean; user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.token) {
      localStorage.setItem("servepoint_token", res.token);
      localStorage.setItem("servepoint_user", JSON.stringify(res.user));
    }
    return res;
  },

  async register(payload: { name: string; email: string; password?: string; phone?: string; role: "customer" | "provider" | "artisan"; trade?: string; area?: string; address?: string }): Promise<{ ok: boolean; user: User; token: string }> {
    const res = await request<{ ok: boolean; user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.token) {
      localStorage.setItem("servepoint_token", res.token);
      localStorage.setItem("servepoint_user", JSON.stringify(res.user));
    }
    return res;
  },

  async logout(): Promise<{ ok: boolean }> {
    try {
      await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("servepoint_token");
    localStorage.removeItem("servepoint_user");
    return { ok: true };
  },

  // Providers
  async getProviders(includePending = false): Promise<{ providers: Provider[] }> {
    return request<{ providers: Provider[] }>(`/api/providers${includePending ? "?includePending=true" : ""}`);
  },

  async onboardProvider(provider: Partial<Provider>): Promise<{ ok: boolean; provider: Provider }> {
    return request<{ ok: boolean; provider: Provider }>("/api/providers/onboard", {
      method: "POST",
      body: JSON.stringify(provider),
    });
  },

  async verifyProvider(providerId: string, status: "approved" | "declined" | "suspended"): Promise<{ ok: boolean; provider: Provider }> {
    return request<{ ok: boolean; provider: Provider }>(`/api/providers/${encodeURIComponent(providerId)}/verify`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  async addProviderService(providerId: string, service: ProviderService): Promise<{ ok: boolean; provider: Provider }> {
    return request<{ ok: boolean; provider: Provider }>(`/api/providers/${encodeURIComponent(providerId)}/services`, {
      method: "POST",
      body: JSON.stringify(service),
    });
  },

  async updateProviderService(providerId: string, serviceId: string, service: Partial<ProviderService>): Promise<{ ok: boolean; provider: Provider }> {
    return request<{ ok: boolean; provider: Provider }>(`/api/providers/${encodeURIComponent(providerId)}/services/${encodeURIComponent(serviceId)}`, {
      method: "PUT",
      body: JSON.stringify(service),
    });
  },

  async deleteProviderService(providerId: string, serviceId: string): Promise<{ ok: boolean; provider: Provider }> {
    return request<{ ok: boolean; provider: Provider }>(`/api/providers/${encodeURIComponent(providerId)}/services/${encodeURIComponent(serviceId)}`, {
      method: "DELETE",
    });
  },

  async getProviderAvailability(providerId: string): Promise<{ ok: boolean; availability: ProviderAvailability }> {
    return request<{ ok: boolean; availability: ProviderAvailability }>(`/api/providers/${encodeURIComponent(providerId)}/availability`);
  },

  async updateProviderAvailability(providerId: string, availability: Partial<ProviderAvailability>): Promise<{ ok: boolean; availability: ProviderAvailability }> {
    return request<{ ok: boolean; availability: ProviderAvailability }>(`/api/providers/${encodeURIComponent(providerId)}/availability`, {
      method: "PUT",
      body: JSON.stringify(availability),
    });
  },

  // Bookings
  async getBookings(filter?: { customerId?: string; providerId?: string; status?: string }): Promise<{ bookings: Booking[] }> {
    const params = new URLSearchParams();
    if (filter?.customerId) params.set("customerId", filter.customerId);
    if (filter?.providerId) params.set("providerId", filter.providerId);
    if (filter?.status) params.set("status", filter.status);
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<{ bookings: Booking[] }>(`/api/bookings${q}`);
  },

  async createBooking(booking: Partial<Booking>): Promise<{ ok: boolean; booking: Booking }> {
    return request<{ ok: boolean; booking: Booking }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(booking),
    });
  },

  async respondToBooking(bookingId: string, action: "accepted" | "declined" | "confirmed" | "in-progress" | "completed" | "rejected", notes?: string): Promise<{ ok: boolean; booking: Booking }> {
    return request<{ ok: boolean; booking: Booking }>(`/api/bookings/${encodeURIComponent(bookingId)}/respond`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    });
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<{ ok: boolean; booking: Booking }> {
    return request<{ ok: boolean; booking: Booking }>(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async updateBookingProgress(bookingId: string, action: "start" | "complete", notes?: string): Promise<{ ok: boolean; booking: Booking }> {
    return request<{ ok: boolean; booking: Booking }>(`/api/bookings/${encodeURIComponent(bookingId)}/progress`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    });
  },

  // Admin Operations
  async getAdminCustomers(): Promise<{ ok: boolean; customers: AdminCustomer[] }> {
    return request<{ ok: boolean; customers: AdminCustomer[] }>("/api/admin/customers");
  },

  async updateCustomerStatus(customerId: string, status: "active" | "suspended", reason?: string): Promise<{ ok: boolean; customer: AdminCustomer }> {
    return request<{ ok: boolean; customer: AdminCustomer }>(`/api/admin/customers/${encodeURIComponent(customerId)}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, reason }),
    });
  },

  async setProviderSuspension(providerId: string, suspended: boolean): Promise<{ ok: boolean; provider: Provider }> {
    return request<{ ok: boolean; provider: Provider }>(`/api/providers/${encodeURIComponent(providerId)}/suspend`, {
      method: "POST",
      body: JSON.stringify({ suspended }),
    });
  },

  async adminCancelBooking(bookingId: string, reason: string): Promise<{ ok: boolean; booking: Booking }> {
    return request<{ ok: boolean; booking: Booking }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async deleteCategory(categoryId: string): Promise<{ ok: boolean; message: string }> {
    return request<{ ok: boolean; message: string }>(`/api/categories/${encodeURIComponent(categoryId)}`, {
      method: "DELETE",
    });
  },

  // Categories
  async getCategories(): Promise<{ categories: Category[] }> {
    return request<{ categories: Category[] }>("/api/categories");
  },

  async createCategory(category: Partial<Category>): Promise<{ ok: boolean; category: Category }> {
    return request<{ ok: boolean; category: Category }>("/api/categories", {
      method: "POST",
      body: JSON.stringify(category),
    });
  },

  async updateCategory(categoryId: string, category: Partial<Category>): Promise<{ ok: boolean; category: Category }> {
    return request<{ ok: boolean; category: Category }>(`/api/categories/${encodeURIComponent(categoryId)}`, {
      method: "PUT",
      body: JSON.stringify(category),
    });
  },

  // Stats
  async getStats(): Promise<{ stats: PlatformStats }> {
    return request<{ stats: PlatformStats }>("/api/stats");
  },

  // Reviews
  async getReviews(providerId?: string): Promise<{ ok: boolean; reviews: Review[]; averageRating: number; totalReviews: number }> {
    const q = providerId ? `?providerId=${encodeURIComponent(providerId)}` : "";
    return request<{ ok: boolean; reviews: Review[]; averageRating: number; totalReviews: number }>(`/api/reviews${q}`);
  },

  async getReviewForBooking(bookingId: string): Promise<{ ok: boolean; review: Review | null }> {
    return request<{ ok: boolean; review: Review | null }>(`/api/reviews?bookingId=${encodeURIComponent(bookingId)}`);
  },

  async createReview(payload: { bookingId: string; rating: number; comment: string }): Promise<{ ok: boolean; review: Review; providerRating: number }> {
    return request<{ ok: boolean; review: Review; providerRating: number }>("/api/reviews", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
