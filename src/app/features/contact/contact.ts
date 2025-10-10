import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, NgIf],
  styles: [`
      /* Animación del check dibujándose */
      .checkmark {
        stroke-dasharray: 48;
        stroke-dashoffset: 48;
        animation: draw 800ms ease-out forwards 200ms;
      }
      @keyframes draw {
        to { stroke-dashoffset: 0; }
      }
      /* Pop-in del círculo */
      .scale-in {
        animation: scaleIn 380ms cubic-bezier(.2,.8,.2,1) forwards;
        transform: scale(.6);
        opacity: 0;
      }
      @keyframes scaleIn {
        to { transform: scale(1); opacity: 1; }
      }
    `],
  template: `
    <section class="max-w-xl mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4">Contacto</h2>

      <form *ngIf="!sent()" [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
        <!-- Honeypot anti-spam -->
         <input type="text" formControlName="nickname" class="hidden" tabindex="-1" autocomplete="off" />

         <input class="w-full bg-neutral-900 rounded p-2" placeholder="Tu nombre" formControlName="name" />
         <input class="w-full bg-neutral-900 rounded p-2" placeholder="Tu email" type="email" formControlName="email" />
         <textarea class="w-full bg-neutral-900 rounded p-2" placeholder="¿En qué puedo ayudarte?" rows='5' formControlName="message"></textarea>

         <button class="bg-[var(--color-brand)] px-4 py-2 rounded disabled:opacity-50" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Enviando...': 'Enviar' }}
         </button>
      </form>

      <p *ngIf="error()" class="text-red-400">Hubo un problema. Inténtalo más tarde.</p>

    <!-- CONFIRMACIÓN -->
     <div *ngIf="sent()" class="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
      <div class="mx-auto mb-4 flex items-center justify-center">
      <!-- Círculo + check animado (SVG) -->
       <svg class="scale-in" width="84" height="84" viewBox="0 0 84 84" fill="none" aria-hidden="true">
        <circle cx="42" cy="42" r="36"
          class="text-green-500/20" stroke="currentColor"
          stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
       </svg>
      </div>
      <h3 class="text-xl font-semibold mb-1">¡Mensaje enviado!</h3>
      <p class="text-neutral-300">
        Te he enviado un correo de confirmación. Te responderé en cuanto pueda.
      </p>

      <button (click)="reset()" 
        class="mt-6 inline-flex items-center gap-2 rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700">
        Enviar otro mensaje
      </button>
     </div>
    </section>
  `
})
export class Contact {
  private fb = inject(FormBuilder);

  loading = signal(false);
  sent = signal(false);
  error = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
    nickname: [''] // Honeypot (debería permanecer vacío)
  });

  async submit() {
    this.sent.set(false); this.error.set(false);
    if (this.form.invalid) return;
    if (this.form.value.nickname) return; // Un spam bot rellenaría esto

    this.loading.set(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.form.value)
      });
      if (!res.ok) throw new Error('Bad response');
      this.sent.set(true);
      this.form.reset();
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false)
    }
  }

  reset() {
    this.sent.set(false);
    this.error.set(false);
  }
}
