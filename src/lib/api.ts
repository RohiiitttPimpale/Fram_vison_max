/**
 * API Service for backend communication
 * Handles all HTTP requests to Flask backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("agrismart_jwt_token");
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("agrismart_jwt_token", token);
    } else {
      localStorage.removeItem("agrismart_jwt_token");
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get headers with optional auth token
   */
  private getHeaders(includeAuth: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (includeAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    method: string = "GET",
    body: unknown = null,
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(includeAuth),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorMessage = "API request failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorData.msg || errorMessage;
        } catch {
          // Keep default message when response is not JSON.
        }
        throw new Error(errorMessage);
      }

      const data: ApiResponse<T> = await response.json();
      return data.data || (data as T);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health", "GET", null, false);
  }

  // ===== AUTH ENDPOINTS =====

  /**
   * Sign up new user
   */
  async signup(data: {
    email: string;
    password: string;
    name: string;
    location?: string;
    farm_size?: string;
    preferred_crop?: string;
  }): Promise<{ user: UserProfile; access_token: string }> {
    return this.request(
      "/auth/signup",
      "POST",
      data,
      false
    );
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: UserProfile; access_token: string }> {
    return this.request("/auth/login", "POST", { email, password }, false);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile> {
    return this.request("/auth/me", "GET");
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return this.request("/auth/profile", "PUT", data);
  }

  // ===== CROP ENDPOINTS =====

  /**
   * Get all crops for user
   */
  async getCrops(): Promise<Crop[]> {
    return this.request("/crops/", "GET");
  }

  /**
   * Create a new crop
   */
  async createCrop(data: {
    crop_id: string;
    selected_crop: string;
    start_date?: string;
    has_schedule?: boolean;
    soil_complete?: boolean;
    soil_data?: unknown;
  }): Promise<Crop> {
    return this.request("/crops/", "POST", data);
  }

  /**
   * Get a specific crop
   */
  async getCrop(cropId: number): Promise<Crop> {
    return this.request(`/crops/${cropId}`, "GET");
  }

  /**
   * Update a crop
   */
  async updateCrop(
    cropId: number,
    data: Partial<Crop>
  ): Promise<Crop> {
    return this.request(`/crops/${cropId}`, "PUT", data);
  }

  /**
   * Delete a crop
   */
  async deleteCrop(cropId: number): Promise<void> {
    return this.request(`/crops/${cropId}`, "DELETE");
  }

  // ===== TASK ENDPOINTS =====

  /**
   * Get all tasks for a crop
   */
  async getCropTasks(cropId: number): Promise<Task[]> {
    return this.request(`/tasks/crop/${cropId}`, "GET");
  }

  /**
   * Create a task
   */
  async createTask(data: {
    crop_id: number;
    task_key: string;
    day_start: number;
    completed?: boolean;
  }): Promise<Task> {
    return this.request("/tasks/", "POST", data);
  }

  /**
   * Update a task
   */
  async updateTask(taskId: number, data: Partial<Task>): Promise<Task> {
    return this.request(`/tasks/${taskId}`, "PUT", data);
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number): Promise<void> {
    return this.request(`/tasks/${taskId}`, "DELETE");
  }

  // ===== PREDICTION ENDPOINTS =====

  async getPredictionMetadata(): Promise<PredictionMetadata> {
    return this.request("/prediction/metadata", "GET");
  }

  async predictYieldModel(data: ModelPredictionRequest): Promise<ModelPredictionResponse> {
    return this.request("/prediction/yield", "POST", data);
  }
}

export interface UserProfile {
  id?: number;
  email: string;
  name: string;
  location?: string;
  farm_size?: string;
  preferred_crop?: string;
}

export interface Crop {
  id?: number;
  crop_id: string;
  selected_crop: string;
  start_date?: string;
  has_schedule: boolean;
  soil_complete: boolean;
  soil_data?: unknown;
  created_at?: string;
}

export interface Task {
  id?: number;
  crop_id?: number;
  task_key: string;
  day_start: number;
  completed: boolean;
  completed_at?: string;
}

export interface PredictionMetadata {
  crops: string[];
  states: string[];
  feature_columns: string[];
}

export interface ModelPredictionRequest {
  crop: string;
  state: string;
  area: number;
  fertilizer: number;
  pesticide: number;
  avg_temp_c: number;
  total_rainfall_mm: number;
  avg_humidity_percent: number;
  N: number;
  P: number;
  K: number;
  pH: number;
}

export interface ModelPredictionResponse {
  predicted_yield: number;
  unit: string;
  model_crop: string;
  model_state: string;
}

export const apiClient = new ApiClient(API_BASE_URL);
