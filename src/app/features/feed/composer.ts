// src/app/features/feed/composer.component.ts
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { PostsService } from '../../core/services/post.service';

@Component({
  standalone: true,
  selector: 'app-composer',
  imports: [ReactiveFormsModule, NgIf],
  styles: [`
    @reference "../../../styles.css";
    .input { @apply w-full rounded bg-neutral-900 p-2; }
    .btn { @apply rounded px-4 py-2 text-white disabled:opacity-50; }
    .muted { @apply text-sm text-neutral-400; }
    .ok { @apply text-green-400 text-sm; }
    .error { @apply text-red-400 text-sm; }
  `],
  template: `
  <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
    <input class="input" placeholder="Título" formControlName="title" />
    <textarea class="input" rows="6"
              placeholder="Contenido (HTML ya procesado; si usas Markdown, conviértelo antes)"
              formControlName="contentHtml"></textarea>

    <input class="input" placeholder="Excerpt (opcional)" formControlName="excerpt" />
    <input class="input" placeholder="URL de portada (opcional)" formControlName="cover" />
    <input class="input" placeholder="Imágenes (URLs separadas por coma)" formControlName="images" />
    <input class="input" placeholder="Tags (separadas por coma)" formControlName="tags" />

    <button class="btn bg-[var(--color-brand)]" type="submit" [disabled]="form.invalid || loading()">
      {{ loading() ? 'Publicando…' : 'Publicar post' }}
    </button>

    <p *ngIf="ok()" class="ok">✅ Publicado correctamente</p>
    <p *ngIf="err()" class="error">❌ {{ errorMsg() }}</p>
    <p class="muted">Solo los usuarios autenticados pueden publicar (API_KEY temporal).</p>
  </form>
  `
})
export class Composer {
  private fb = inject(FormBuilder);
  private postsSvc = inject(PostsService);

  loading = signal(false);
  ok = signal(false);
  err = signal(false);
  errorMsg = signal(''); // mensaje de error del backend si lo hay

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    contentHtml: ['', [Validators.required, Validators.minLength(2)]],
    excerpt: [''],
    cover: [''],
    images: [''],
    tags: ['']
  });

  async submit() {
    this.ok.set(false);
    this.err.set(false);
    this.errorMsg.set('');
    if (this.form.invalid) return;

    const key = localStorage.getItem('ADMIN_KEY');
    if (!key) {
      this.err.set(true);
      this.errorMsg.set('No hay sesión activa. Ve a /admin y verifica el código para obtener una API_KEY.');
      return;
    }

    // Normaliza payload
    const v = this.form.value;
    const payload = {
      title: (v.title || '').trim(),
      contentHtml: (v.contentHtml || '').trim(),
      excerpt: (v.excerpt || '').trim(),
      cover: (v.cover || '').trim() || null,
      images: (v.images || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      tags: (v.tags || '')
        .split(',')
        .map(s => s.trim().replace(/^#/, '')) // quita # inicial si lo pone
        .filter(Boolean)
    };

    this.loading.set(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      // El backend devuelve { ok:true, post }
      const { post } = await res.json() as { ok: boolean; post: any };

      // ⚡️ Insertamos optimistamente al principio del feed
      this.postsSvc.prepend(post);

      this.ok.set(true);
      this.form.reset();

      // (Opcional) refuerzo desde servidor: descomenta si quieres
      // await this.postsSvc.refresh();
    } catch (e: any) {
      console.error('[composer] publish error:', e);
      this.err.set(true);
      this.errorMsg.set(e?.message || 'Error al publicar');
    } finally {
      this.loading.set(false);
    }
  }
}