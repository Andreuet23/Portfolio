// src/app/pages/admin/admin-page.component.ts
import { Component, signal, computed, inject } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Composer } from '../../features/feed/composer';
import { Post, PostsService } from '../../core/services/post.service';
import { RouterLink } from '@angular/router';

type Step = 'idle' | 'requesting' | 'sent' | 'verifying' | 'ready' | 'error';

@Component({
  standalone: true,
  selector: 'app-admin-page',
  imports: [NgIf, NgFor, DatePipe, ReactiveFormsModule, Composer, RouterLink],
  template: `
    <section class="space-y-6">
      <header class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Panel de publicación</h2>
        <span *ngIf="isReady()" class="badge">
          Sesión activa
          <span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
        </span>
      </header>

      <!-- Login -->
      <div *ngIf="!isReady()" class="card p-5 space-y-4">
        <p class="muted">
          Para publicar, solicita un <strong>código</strong> a tu correo <code>contact@syco.dev</code>.
        </p>
        <div class="row">
          <div class="space-y-2">
            <h3 class="title">1) Solicitar código</h3>
            <button class="btn btn-brand" (click)="requestCode()" [disabled]="isRequesting()">
              {{ isRequesting() ? 'Enviando…' : 'Enviar código por email' }}
            </button>
          </div>

          <div class="space-y-2">
            <h3 class="title">2) Verificar y acceder</h3>
            <form [formGroup]="codeForm" (ngSubmit)="verifyCode()" class="space-y-2" novalidate>
              <input class="input" placeholder="Código de 6 dígitos" maxlength="6" formControlName="code" />
              <div class="flex items-center gap-2">
                <button class="btn btn-brand" type="submit" [disabled]="codeForm.invalid || isVerifying()">
                  {{ isVerifying() ? 'Verificando…' : 'Verificar' }}
                </button>
                <button class="btn btn-ghost" type="button" (click)="resetLogin()" [disabled]="isVerifying()">Limpiar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Editor -->
      <div *ngIf="isReady()" class="space-y-6">
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="muted">Autenticado como administrador.</p>
            <div class="flex items-center gap-2">
              <button class="btn btn-ghost" (click)="refreshFeed()">Actualizar feed</button>
              <button class="btn btn-ghost" (click)="logout()">Cerrar sesión</button>
            </div>
          </div>
          <app-composer></app-composer>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="title">Tus publicaciones</h3>
            <span class="muted text-sm">{{ posts().length }} elemento(s)</span>
          </div>

          <div *ngIf="posts().length === 0" class="muted">Aún no hay publicaciones.</div>

          <div *ngFor="let p of posts()" class="post-row">
            <div class="min-w-0">
              <a class="post-title hover:underline" [routerLink]="['/post', p.slug]">{{ p.title || p.slug }}</a>
              <div class="post-meta">
                {{ p.createdAt | date:'medium' }}
                <ng-container *ngIf="p.tags?.length"> • {{ (p.tags ?? []).join(', ') }}</ng-container>
              </div>
            </div>
            <div class="actions">
              <a class="btn btn-ghost" [routerLink]="['/post', p.slug]">Abrir</a>
              <button class="btn btn-danger" (click)="deletePost(p)">Borrar</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class AdminPage {
  private fb = inject(FormBuilder);
  private postsSvc = inject(PostsService);

  // estado auth
  step = signal<Step>(localStorage.getItem('ADMIN_KEY') ? 'ready' : 'idle');
  errorMsg = signal('');

  // posts
  posts = computed<Post[]>(() => this.postsSvc.posts());

  // forms
  codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  // helpers UI
  isReady      = computed(() => this.step() === 'ready');
  isRequesting = computed(() => this.step() === 'requesting');
  isVerifying  = computed(() => this.step() === 'verifying');

  // acciones auth
  async requestCode() {
    this.errorMsg.set('');
    this.step.set('requesting');
    try {
      const res = await fetch('/auth/request', { method: 'POST' }); // ↔ vercel.json debe reescribir a /api/auth/request
      if (!res.ok) throw new Error('No se pudo enviar el código');
      this.step.set('sent');
    } catch (e: any) {
      this.errorMsg.set(e?.message || 'Error solicitando el código');
      this.step.set('error');
    }
  }

  async verifyCode() {
    this.errorMsg.set('');
    if (this.codeForm.invalid) return;
    this.step.set('verifying');

    try {
      const res = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: this.codeForm.value.code })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Código inválido o caducado');
      }
      const data = await res.json() as { ok: boolean; apiKey: string; expiresIn: number };
      if (!data?.ok || !data?.apiKey) throw new Error('Respuesta inválida del servidor');

      localStorage.setItem('ADMIN_KEY', data.apiKey);
      this.codeForm.reset();
      this.step.set('ready');
    } catch (e: any) {
      this.errorMsg.set(e?.message || 'Error verificando el código');
      this.step.set('error');
    }
  }

  resetLogin() {
    this.codeForm.reset();
    this.errorMsg.set('');
    this.step.set('idle');
  }

  logout() {
    localStorage.removeItem('ADMIN_KEY');
    this.step.set('idle');
  }

  // gestión de posts
  async deletePost(p: Post) {
    const key = localStorage.getItem('ADMIN_KEY');
    if (!key) return alert('Sesión caducada. Vuelve a /admin.');
    if (!p?.id) return alert('Este post no tiene id. Actualiza el feed y vuelve a intentar.');
    if (!confirm(`¿Borrar "${p.title || p.slug}"? Esta acción no se puede deshacer.`)) return;

    try {
      await this.postsSvc.removeById(p.id); // ← usa el token de admin
      // listo: PostsService ya quita el post de la señal local
    } catch (e) {
      console.error(e);
      alert('Error al borrar el post.');
    }
  }

  refreshFeed() {
    // fuerza recarga del feed desde el backend (útil tras publicar/borrar)
    this.postsSvc['refresh']?.();
  }
}