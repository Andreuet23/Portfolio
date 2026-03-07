import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

interface Project {
  title: string;
  description: string;
  cover: string;
  tags: string[];
  demo?: string;
  repo?: string;
}

@Component({
  selector: 'app-content',
  imports: [NgFor, NgIf],
  styles: [
    `
      @reference "../../../styles.css";

      .grid-projects {
        @apply grid gap-6 sm:grid-cols-2;
      }
      .card {
        @apply rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/60 hover:bg-neutral-900 transition duration-200 backdrop-blur;
      }
      .thumb {
        @apply w-full aspect-[16/10] object-cover;
      }
      .body {
        @apply p-4;
      }
      .title {
        @apply text-lg font-semibold mb-1;
      }
      .muted {
        @apply text-neutral-400 text-sm;
      }
      .tags {
        @apply flex flex-wrap gap-2 mt-3;
      }
      .tag {
        @apply text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10;
      }
      .links {
        @apply mt-4 flex gap-3;
      }
      .btn {
        @apply inline-block text-sm font-medium px-3 py-1.5 rounded-md border transition;
      }
      .btn-demo {
        @apply border-[var(--color-brand)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white;
      }
      .btn-repo {
        @apply border-white/10 text-white hover:bg-white/10;
      }
    `,
  ],
  template: `
    <section class="space-y-6">
      <h2 class="text-2xl font-bold">Proyectos destacados</h2>
      <p class="text-neutral-400 max-w-prose">
        Algunos de los proyectos personales y experimentos que he construido. Todos hechos con
        pasión, buscando equilibrio entre diseño, rendimiento y funcionalidad.
      </p>

      <div class="grid-projects">
        <div *ngFor="let p of projects" class="card group">
          <img [src]="p.cover" [alt]="p.title" class="thumb group-hover:opacity-90" />
          <div class="body">
            <h3 class="title">{{ p.title }}</h3>
            <p class="muted">{{ p.description }}</p>
            <div class="tags">
              <span *ngFor="let t of p.tags" class="tag">{{ t }}</span>
            </div>
            <div class="links">
              <a *ngIf="p.demo" [href]="p.demo" target="_blank" rel="noopener" class="btn btn-demo"
                >Demo</a
              >
              <a *ngIf="p.repo" [href]="p.repo" target="_blank" rel="noopener" class="btn btn-repo"
                >Código</a
              >
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class Content {
  projects: Project[] = [
    {
      title: 'Portfolio syco.dev',
      description:
        'Mi propio sitio personal, construido con Angular 20, Tailwind v4 y serverless functions. Incluye feed tipo Twitter y RSS.',
      cover: '/assets/projects/portfolio.png',
      tags: ['Angular', 'Tailwind', 'Vercel', 'Resend'],
      demo: 'https://syco.dev',
      repo: 'https://github.com/Andreuet23/Portfolio',
    },
    {
      title: 'PokéApi - Pokédex web',
      description:
        'Simulador de Pokédex, inspirado en los juegos clásicos para buscar a todos tus Pokémon favoritos.',
      cover: '/assets/projects/pokemon.png',
      tags: ['TypeScript', 'React', 'PokeApi', 'Vite'],
      demo: 'https://andreuet23.github.io/PokeApi/',
      repo: 'https://github.com/Andreuet23/PokeApi',
    },
    {
      title: 'MovieX - Buscador de películas',
      description:
        'Aplicación web de búsqueda de películas, ver detalles, trailers y las plataformas en las que está disponible.',
      cover: '/assets/projects/movieX.png',
      tags: ['JavaScript', 'HTML5', 'CSS'],
      demo: 'https://andreuet23.github.io/MovieX/',
      repo: 'https://github.com/Andreuet23/MovieX',
    },
  ];
}
