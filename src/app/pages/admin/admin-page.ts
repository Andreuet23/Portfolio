// src/app/pages/admin/admin-page.component.ts
import { Component, signal, computed, inject } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Composer } from '../../features/feed/composer';
import { Post, PostsService } from '../../core/services/post.service';

type Step = 'idle' | 'requesting' | 'sent' | 'verifying' | 'ready' | 'error';

@Component({
  standalone: true,
  selector: 'app-admin-page',
  imports: [NgIf, NgFor, DatePipe, ReactiveFormsModule, Composer],
  styles: [`
    @reference "../../../styles.css";
    .card { @apply max-w-xl mx-auto p-4 rounded-xl border border-neutral-800 bg-neutral-900/50; }
    .btn  { @apply rounded px-4 py-2; }
    .btn-brand { @apply bg-[var(--color-brand)] text-white disabled:opacity-50; }
    .input { @apply w-full rounded bg-neutral-900 p-2; }
    .muted { @apply text-sm text-neutral-400; }
    .error { @apply text-red-400 text-sm; }
    .ok { @apply text-green-400 text-sm; }
    .row { @apply border-b border-neutral-800 p-3; }
    .danger { @apply text-red-400 underline text-sm; }
  `],
  template: `
  <section class="p-4">
    <h2 class="text-2xl font-bold mb-4">Panel de publicación</h2>

    <!-- Bloqueo / Login -->
    <div *ngIf="!isReady()" class="card space-y-3">
      <p class="muted">
        Para publicar, solicita un <strong>código</strong> a tu correo <code>contact@syco.dev</code>.
        Ese código te dará una <strong>clave temporal</strong> para publicar durante 24h.
      </p>

      <!-- Paso 1: Solicitar código -->
      <div class="space-y-2">
        <button class="btn btn-brand" (click)="requestCode()" [disabled]="isRequesting()">Enviar código por email</button>
        <p *ngIf="step() === 'sent'" class="ok">Código enviado. Revisa tu correo y pégalo aquí abajo.</p>
        <p *ngIf="step() === 'error'" class="error">{{ errorMsg() }}</p>
      </div>

      <!-- Paso 2: Verificar código -->
      <form [formGroup]="codeForm" (ngSubmit)="verifyCode()" class="space-y-2">
        <input class="input" placeholder="Código de 6 dígitos" maxlength="6" formControlName="code" />
        <button class="btn btn-brand" type="submit" [disabled]="codeForm.invalid || isVerifying()">Verificar y acceder</button>
      </form>

      <p class="muted">Si no te llega el correo, espera unos segundos y vuelve a solicitar otro código.</p>
    </div>

    <!-- Editor / Composer + Lista de posts (solo si autenticado) -->
    <div *ngIf="isReady()" class="space-y-4">
      <div class="card">
        <p class="muted mb-3">
          Estás autenticado para publicar. La clave expira automáticamente (24h por defecto).
        </p>
        <app-composer></app-composer>
        <div class="mt-4 flex items-center justify-between">
          <button class="text-sm underline" (click)="logout()">Cerrar sesión</button>
          <span class="muted">Tip: guarda esta URL en marcadores.</span>
        </div>
      </div>

      <!-- Lista básica de posts con botón Borrar -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-2">Tus posts</h3>
        <div *ngIf="(posts() || []).length === 0" class="muted">Aún no hay posts.</div>

        <article *ngFor="let p of posts(); trackBy: trackById" class="row">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-semibold">{{ p.title }}</div>
              <div class="muted">
                {{ p.createdAt | date:'medium' }}
                <ng-container *ngIf="p.updatedAt"> · act. {{ p.updatedAt | date:'medium' }}</ng-container>
              </div>
            </div>
            <div>
              <button *ngIf="p.id as pid" class="danger" (click)="deletePost(pid)">
                Borrar
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
  `
})
export class AdminPage {
  private fb = inject(FormBuilder);
  private postsSvc = inject(PostsService);

  // estado de login
  step = signal<Step>(localStorage.getItem('ADMIN_KEY') ? 'ready' : 'idle');
  errorMsg = signal('');

  // lista de posts (signal del servicio)
  posts = computed<Post[]>(() => this.postsSvc.posts());

  codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  isReady = computed(() => this.step() === 'ready');
  isRequesting = computed(() => this.step() === 'requesting');
  isVerifying = computed(() => this.step() === 'verifying');

  trackById = (_: number, p: Post) => p.id ?? p.slug;

  async requestCode() {
    this.errorMsg.set('');
    this.step.set('requesting');
    try {
      const res = await fetch('/api/auth/request', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data?.error || 'No se pudo enviar el código');
      }
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
      const res = await fetch('/api/auth/verify', {
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

      // refresca el listado tras loguearte
      await this.postsSvc.refresh();
    } catch (e: any) {
      this.errorMsg.set(e?.message || 'Error verificando el código');
      this.step.set('error');
    }
  }

  async deletePost(id: string) {
  const key = localStorage.getItem('ADMIN_KEY');
  if (!key) return alert('Sesión caducada. Vuelve a /admin.');
  if (!confirm('¿Borrar este post? Esta acción no se puede deshacer.')) return;

  try {
    await this.postsSvc.removeById(id, key); // ✅ ahora pasa el token correcto
    alert('Post eliminado correctamente.');
  } catch (err) {
    console.error(err);
    alert('Error al borrar el post.');
  }
}

  logout() {
    localStorage.removeItem('ADMIN_KEY');
    this.step.set('idle');
  }
}