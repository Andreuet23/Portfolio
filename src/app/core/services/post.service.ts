// src/app/core/services/post.service.ts
import { Injectable, computed, signal } from '@angular/core';

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  cover?: string | null;
  createdAt: string;
  createdAtMs?: number;
  updatedAt?: string | null;
  tags?: string[];
  images?: string[];
}

const API_BASE = ''; // '' si usas rewrites; '/api' si NO usas rewrites

@Injectable({ providedIn: 'root' })
export class PostsService {
  private _posts = signal<Post[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string>('');

  posts = computed(() => this._posts());
  loading = computed(() => this._loading());
  error = computed(() => this._error());

  async refresh() {
    this._error.set('');
    this._loading.set(true);
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (!res.ok) {
        let detail = '';
        try { const e = await res.json(); detail = e?.error || e?.detail || ''; } catch {}
        throw new Error(detail || `HTTP ${res.status}`);
      }

      const data = await res.json();

      let items: any = data?.items;
      if (Array.isArray(items)) {
        // ok
      } else if (items && typeof items === 'object') {
        items = Object.values(items);
      } else {
        items = [];
      }

      this._posts.set(items as Post[]);
    } catch (e: any) {
      console.error('[posts] refresh error', e);
      this._posts.set([]);
      this._error.set(e?.message || 'No se pudo cargar el feed');
    } finally {
      this._loading.set(false);
    }
  }

  prepend(p: Post) { this._posts.set([p, ...this._posts()]); }
  removeById(id: string) { this._posts.set(this._posts().filter(p => p.id !== id)); }
}