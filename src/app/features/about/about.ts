import { Component } from '@angular/core';
import { RouterLinkActive, RouterLink } from "@angular/router";

@Component({
  selector: 'app-about',
  imports: [RouterLinkActive, RouterLink],
  styles: [`
      @reference "../../../styles.css";

      /* Tarjetas */
      .card { @apply rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur; }
      .pill { @apply inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10; }
      .title { @apply text-xl font-semibold; }
      .muted { @apply text-neutral-400; }
      .hr { @apply h-px bg-white/10 my-6; }

      /* Timeline */
      .tl { @apply relative pl-6; }
      .tl::before { content:""; @apply absolute left-2 top-0 bottom-0 w-px bg-white/10; }
      .dot { @apply absolute -left-0.5 w-3 h-3 rounded-full border border-white/20 bg-[var(--color-brand)]; }

      /* Grid responsive */
      .grid-2 { @apply grid gap-4 md:grid-cols-2; }

      /* Tipografía */
      .prose p { @apply my-3 leading-relaxed; }
      .prose a { @apply underline decoration-white/30 hover:decoration-white; }
    `],
  template: `
    <section class="space-y-6">
    <!-- Intro -->
    <div class="card p-5">
      <h2 class="text-2xl font-bold">Hola, soy Andreu</h2>
      <div class="prose muted">
        <p>
          Desarrollador Frontend de 21 años (2004) especializado en <strong>Angular</strong>. Me gusta realizar interfaces limpias, rápidas y accesibles, con una atención obsesiva por los detalles.
        </p>
        <p>
          En este portfolio publico notas cortas y proyectos. Si te encaja mi perfil, estaré encantado de colaborar en tu siguiente idea.
        </p>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="pill"><span class="i">⚡</span> Angular 20</span>
        <span class="pill"><span class="i">🎯</span> UI/UX pragmática</span>
        <span class="pill"><span class="i">🚀</span> Performance</span>
        <span class="pill"><span class="i">🧩</span> Component Design</span>
        <span class="pill"><span class="i">🧪</span> Testing</span>
      </div>
    </div>

    <!-- Habilidades / Stack -->
    <div class="grid-2">
      <div class="card p-5">
        <h3 class="title">Tecnologías</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="pill">Angular</span>
          <span class="pill">TypeScript</span>
          <span class="pill">ReactJS</span>
          <span class="pill">Tailwind</span>
          <span class="pill">Node/Express</span>
          <span class="pill">Vercel</span>
          <span class="pill">PHP</span>
          <span class="pill">Python</span>
          <span class="pill">Linux</span>
          <span class="pill">ZSH</span>
        </div>
        <p class="muted mt-3">
          También me siento cómodo montando, configurando y trabajando con redes y hardware.
        </p>
      </div>

      <div class="card p-5">
        <h3 class="title">Cómo trabajo</h3>
        <ul class="list-disc pl-5 muted">
          <li>Primero repaso todo lo necesario para asegurarme de tener claros los conocimientos.</li>
          <li>Seguidamente pienso en el diseño que quiero para el proyecto.</li>
          <li>Al terminar la estructura base del proyecto me pongo con los detalles que marcan la diferencia.</li>
        </ul>
      </div>
    </div>

    <!-- Timeline -->
    <div class="card p-5">
      <h3 class="title">Recorrido</h3>
      <div class="mt-4 space-y-5">
        <div class="tl">
          <span class="dot"></span>
          <h4 class="font-semibold">2025 — Portfolio en producción</h4>
          <p class="muted">Construcción de un feed tipo Twitter con Angular, Typescript, Tailwind, RSS y funciones serverless.</p>
        </div>
        <div class="tl">
          <span class="dot"></span>
          <h4 class="font-semibold">2024 — Prácticas en Angular y ReactJS</h4>
          <p class="muted">Aprendiendo a usar bibliotecas y frameworks.</p>
        </div>
        <div class="tl">
          <span class="dot"></span>
          <h4 class="font-semibold">2023 — Primeros proyectos web</h4>
          <p class="muted">Bases sólidas de HTML, CSS, JavaScript y diseño de interfaces.</p>
        </div>
        <div class="tl">
          <span class="dot"></span>
          <h4 class="font-semibold">2022 — Sistemas microinformáticos y redes</h4>
          <p class="muted">Bases sobre hardware, montaje y mantenimiento de equipos, redes y sistemas.</p>
        </div>
      </div>
    </div>

    <!-- Valores + Extras -->
    <div class="grid-2">
      <div class="card p-5">
        <h3 class="title">Valores</h3>
        <p class="muted">
          Código que alguien pueda mantener. Comunicación clara, directa y entregas fiables.
        </p>
      </div>
      <div class="card p-5">
        <h3 class="title">Herramientas</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="pill">VS Code</span>
          <span class="pill">Git/GitHub</span>
          <span class="pill">ESLint/Prettier</span>
          <span class="pill">Vite</span>
          <span class="pill">MacOS</span>
          <span class="pill">ParrotOS</span>
          <span class="pill">VMWare</span>
        </div>
      </div>
    </div>

    <div class="hr"></div>

    <!-- CTA -->
    <div class="card p-5 text-center">
      <h3 class="text-xl font-semibold">¿Trabajamos juntos?</h3>
      <p class="muted mt-1">Cuéntame qué necesitas y te respondo lo antes posible.</p>
      <div class="mt-4 flex items-center justify-center gap-3">
        <a routerLink="/contact" routerLinkActive="router-link-active"
           class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--color-brand)] hover:brightness-105">
          Contactar
        </a>
        <a href="/feed.xml" class="px-4 py-2 rounded-lg text-sm border border-white/15 hover:bg-white/5">
          Seguir por RSS
        </a>
      </div>
    </div>
  </section>
  `
})
export class About {}
