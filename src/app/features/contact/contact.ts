// src/app/pages/contact/contact-page.ts
import { Component, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-contact-page',
  imports: [ReactiveFormsModule, NgIf],
  template: `
  <section class="space-y-6">
    <h2 class="title">Contacto</h2>
    <p class="muted">¿Tienes una propuesta o colaboración? Escríbeme y te contestaré cuanto antes.</p>

    <div class="card p-5 relative" [attr.aria-busy]="loading()">
      <!-- Éxito -->
      <div *ngIf="sent(); else formTpl" class="text-center space-y-4" aria-live="polite">
        <div class="check-wrap"><div class="check">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div></div>
        <h3 class="text-xl font-semibold">¡Mensaje enviado!</h3>
        <p class="muted">He recibido tu correo correctamente. Te responderé en cuanto me sea posible.</p>
        <button class="btn btn-brand" (click)="reset()">Enviar otro mensaje</button>
      </div>

      <!-- Formulario -->
      <ng-template #formTpl>
        <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="row">
            <div>
              <label class="block mb-1">Nombre</label>
              <input class="input" type="text" formControlName="name" placeholder="Tu nombre" autocomplete="name">
              <div class="err" *ngIf="touched('name')">Introduce tu nombre.</div>
            </div>
            <div>
              <label class="block mb-1">Email</label>
              <input class="input" type="email" formControlName="email" placeholder="tu@email.com" autocomplete="email">
              <div class="err" *ngIf="touched('email')">Email no válido.</div>
            </div>
          </div>

          <div>
            <label class="block mb-1">Mensaje</label>
            <textarea class="input ta" formControlName="message" placeholder="Cuéntame en qué puedo ayudarte"></textarea>
            <div class="err" *ngIf="touched('message')">Escribe al menos 10 caracteres.</div>
          </div>

          <!-- Honeypot (anti-spam) -->
          <div class="hp-wrap">
            <label>Nickname <input type="text" formControlName="nickname" tabindex="-1" autocomplete="off"></label>
          </div>

          <div *ngIf="error()" class="err" aria-live="assertive">{{ error() }}</div>

          <div class="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" class="btn btn-ghost" (click)="reset()" [disabled]="loading()">Limpiar</button>
            <button type="submit" class="btn btn-brand" [disabled]="loading() || form.invalid">
              <span>{{ loading() ? 'Enviando…' : 'Enviar' }}</span>
            </button>
          </div>
        </form>
      </ng-template>
    </div>
  </section>
  `
})
export class Contact {
  private fb = inject(FormBuilder);

  loading = signal(false);
  sent    = signal(false);
  error   = signal('');

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    nickname: [''] // honeypot (debe ir vacío)
  });

  touched(ctrl: 'name'|'email'|'message') {
    const c = this.form.controls[ctrl];
    return c.touched && c.invalid;
  }

  async submit() {
    this.error.set('');
    if (this.form.invalid || this.loading()) {
      // marca como tocados por si falta feedback visual
      this.form.markAllAsTouched();
      return;
    }

    // protección anti-autofill accidental en honeypot
    if (this.form.value.nickname) {
      console.warn('[contact] honeypot rellenado: se finge éxito.');
      this.sent.set(true);
      this.form.reset();
      return;
    }

    this.loading.set(true);
    try {
      const res = await fetch('/contact', {   // si no usas rewrite, cambia a '/api/contact'
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          name: this.form.value.name,
          email: this.form.value.email,
          message: this.form.value.message,
          nickname: this.form.value.nickname ?? ''
        })
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `Error HTTP ${res.status}`);
      }

      // opcional: comprobar estructura { ok:true }
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok !== true) console.warn('[contact] respuesta sin ok:true', data);

      this.sent.set(true);
      this.form.reset();

    } catch (e: any) {
      console.error('[contact] submit failed', e);
      this.error.set(e?.message || 'Error enviando el mensaje');
    } finally {
      this.loading.set(false);
    }
  }

  reset() {
    this.form.reset();
    this.sent.set(false);
    this.error.set('');
  }
}