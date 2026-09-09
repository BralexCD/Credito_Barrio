import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BootstrapData,
  Store,
  CreateStoreDto,
  UpdateStoreDto,
  Product,
  CreateProductDto,
  Client,
  CreateClientDto,
  UpdateClientDto,
  Purchase,
  PurchasePreviewRequest,
  PurchasePreviewResponse,
  StatementDetail,
  Payment,
  PayStatementDto
} from '../models/current-account.models';

@Injectable({
  providedIn: 'root'
})
export class CurrentAccountApiService {
  private readonly http = inject(HttpClient);

  getHealth(): Observable<{ ok: boolean }> {
    return this.http.get<{ ok: boolean }>('/api/health');
  }

  getBootstrap(): Observable<BootstrapData> {
    return this.http.get<BootstrapData>('/api/bootstrap');
  }

  // Stores (Solo plataforma)
  createStore(dto: CreateStoreDto): Observable<Store> {
    return this.http.post<Store>('/api/stores', dto);
  }

  updateStore(id: string, dto: UpdateStoreDto): Observable<Store> {
    return this.http.patch<Store>(`/api/stores/${id}`, dto);
  }

  // Products (Solo administrador comercio)
  createProduct(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>('/api/products', dto);
  }

  updateProduct(id: string, dto: Partial<CreateProductDto>): Observable<Product> {
    return this.http.patch<Product>(`/api/products/${id}`, dto);
  }

  // Clients (Solo administrador comercio)
  createClient(dto: CreateClientDto): Observable<Client> {
    return this.http.post<Client>('/api/clients', dto);
  }

  updateClient(id: string, dto: UpdateClientDto): Observable<Client> {
    return this.http.patch<Client>(`/api/clients/${id}`, dto);
  }

  // Purchases (Solo comercio)
  previewPurchase(dto: PurchasePreviewRequest): Observable<PurchasePreviewResponse> {
    return this.http.post<PurchasePreviewResponse>('/api/purchases/preview', dto);
  }

  createPurchase(dto: PurchasePreviewRequest): Observable<Purchase> {
    return this.http.post<Purchase>('/api/purchases', dto);
  }

  // Statements
  generateStatements(cutoffDate: string): Observable<{ created: number }> {
    return this.http.post<{ created: number }>('/api/statements/generate', { cutoffDate });
  }

  getStatementDetail(id: string, asOf?: string): Observable<StatementDetail> {
    let params = new HttpParams();
    if (asOf) {
      params = params.set('asOf', asOf);
    }
    return this.http.get<StatementDetail>(`/api/statements/${id}`, { params });
  }

  exportStatementCsv(id: string, asOf?: string): Observable<Blob> {
    let params = new HttpParams();
    if (asOf) {
      params = params.set('asOf', asOf);
    }
    return this.http.get(`/api/statements/${id}/export`, {
      params,
      responseType: 'blob'
    });
  }

  payStatement(id: string, dto: PayStatementDto): Observable<Payment> {
    return this.http.post<Payment>(`/api/statements/${id}/pay`, dto);
  }
}
