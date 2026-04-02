//lib/v4/utils-hierarchy.ts
/**
 * 🧬 MOTOR DE JERARQUÍA SANSCE V4
 * Transforma datos planos en un árbol de 4 niveles para el renderizado de burbujas.
 */

// 1. Definición de las Fases Fijas solicitadas por Dirección
export const FASES_SANSCE = [
  "Planificación y diseño",
  "Desarrollo de actividades y tareas",
  "Seguimiento y control",
  "Lanzamiento"
];

export interface TaskV4 {
  id: string;
  descripcion: string;
  responsable: string;    // Nombre corto/alias (v3)
  emailCompleto: string;  // 🛡️ Identidad Única para Filtro de Seguridad (v4)
  fechaInicio: string;    // 📅 Inicio de barra en Gantt
  fechaEntrega: string;   // 📅 Fin de barra en Gantt
  estado: string;
  fase: string;           // Nivel 2: Fases fijas SANSCE
  actividad: string;      // Nivel 3: Agrupador
  proyecto: string;       // Nivel 1: Raíz del Proyecto
  prioridad: string;
  observaciones: string;
  area: string;           // 🏢 Clasificación departamental
}

/**
 * Organiza las tareas en una estructura: 
 * [Proyecto] -> [Fase] -> [Actividad] -> [Tareas[]]
 */
export const buildHierarchicalTree = (tasks: TaskV4[]) => {
  const tree: any = {};

  // 🛡️ FILTRO DE SEGURIDAD SANSCE: Solo procesamos tareas activas.
  // Las tareas "Descartadas" permanecen en el Excel pero se omiten en el renderizado.
  const activeTasks = tasks.filter(t => t.estado !== 'Descartada');

  activeTasks.forEach((task) => {
    const { proyecto, fase, actividad } = task;

    // Nivel 1: Proyecto
    if (!tree[proyecto]) {
      tree[proyecto] = {};
      // Inicializamos las 4 fases fijas para que siempre aparezcan en orden
      FASES_SANSCE.forEach(f => {
        tree[proyecto][f] = {};
      });
    }

    // Nivel 2: Fase (Aseguramos que caiga en una fase válida o en 'Lanzamiento' por defecto)
    const faseDestino = FASES_SANSCE.includes(fase) ? fase : "Planificación y diseño";

    // Nivel 3: Actividad
    if (!tree[proyecto][faseDestino][actividad]) {
      tree[proyecto][faseDestino][actividad] = [];
    }

    // Nivel 4: Tarea
    tree[proyecto][faseDestino][actividad].push(task);
  });

  return tree;
};