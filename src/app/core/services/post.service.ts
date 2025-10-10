// src/app/core/services/post.service.ts
import { Injectable, computed, signal } from '@angular/core';

export interface Post {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  cover?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  tags?: string[];
  images?: string[];
}

@Injectable({ providedIn: 'root' })
export class PostsService {
  private _posts = signal<Post[]>([]);
  posts = computed(() => this._posts());
  private _loaded = signal(false);
  loaded = computed(() => this._loaded());

  constructor() { this.refresh(); }

  async refresh() {
    // 👇 En producción, mismo dominio: rutas ABSOLUTAS con barra inicial
    const res = await fetch(`/posts?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar el feed');
    this._posts.set(await res.json());
    this._loaded.set(true);
  }

  prepend(p: Post) { this._posts.set([p, ...this._posts()]); }

  async create(payload: Omit<Post,'id'|'createdAt'|'updatedAt'>, token: string) {
    const res = await fetch(`/posts`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Error creando post');
    const data = await res.json();
    this.prepend(data.post);
    return data.post as Post;
  }

  async removeById(id: string, token: string) {
    const res = await fetch(`/posts?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error borrando post');
    this._posts.set(this._posts().filter(p => p.id !== id));
  }
}