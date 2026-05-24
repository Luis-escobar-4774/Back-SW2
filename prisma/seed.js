require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const habilidadesData = [
  { nombre: 'Bola de Fuego' },
  { nombre: 'Escudo Arcano' },
  { nombre: 'Curacion' },
  { nombre: 'Rayo Helado' },
  { nombre: 'Golpe Critico' },
];

const cartasData = [
  { nombre: 'Mago Novato',     descripcion: 'Aprendiz de la academia',   rareza: 'COMUN',      imagen: 'mago_novato.png',     habilidadIdx: 0 },
  { nombre: 'Guerrero Joven',  descripcion: 'Esgrime una espada basica', rareza: 'COMUN',      imagen: 'guerrero_joven.png',  habilidadIdx: 4 },
  { nombre: 'Sacerdotisa',     descripcion: 'Sana a sus aliados',        rareza: 'RARA',       imagen: 'sacerdotisa.png',     habilidadIdx: 2 },
  { nombre: 'Caballero Real',  descripcion: 'Protector del reino',       rareza: 'RARA',       imagen: 'caballero_real.png',  habilidadIdx: 1 },
  { nombre: 'Hechicero',       descripcion: 'Domina las llamas',         rareza: 'EPICA',      imagen: 'hechicero.png',       habilidadIdx: 0 },
  { nombre: 'Asesino Silencioso', descripcion: 'Ataca por la espalda',   rareza: 'EPICA',      imagen: 'asesino.png',         habilidadIdx: 4 },
  { nombre: 'Dragon de Hielo', descripcion: 'Bestia ancestral',          rareza: 'LEGENDARIA', imagen: 'dragon_hielo.png',    habilidadIdx: 3 },
  { nombre: 'Fenix Eterno',    descripcion: 'Renace de las cenizas',     rareza: 'LEGENDARIA', imagen: 'fenix.png',           habilidadIdx: 0 },
];

const modulosData = [
  {
    titulo: 'Introduccion a Variables en Python',
    descripcion: 'Aprende a declarar y usar variables en Python.',
    orden: 1,
    pasos: [
      { titulo: 'Que es una variable?',  contenidoTextual: 'Una variable es un espacio en memoria con un nombre que guarda un valor.', orden: 1 },
      { titulo: 'Tipos basicos',         contenidoTextual: 'int, float, str, bool son los tipos basicos en Python.', orden: 2 },
      { titulo: 'Ejercicio practico',    contenidoTextual: 'Crea una variable de cada tipo y muestrala con print().', orden: 3 },
    ],
  },
  {
    titulo: 'Introduccion a Bucles en Python',
    descripcion: 'Domina los bucles for y while para repetir tareas.',
    orden: 2,
    pasos: [
      { titulo: 'Que es un bucle?',      contenidoTextual: 'Un bucle ejecuta un bloque de codigo varias veces.', orden: 1 },
      { titulo: 'Bucle for',             contenidoTextual: 'Itera sobre una secuencia. Ej: for i in range(5): print(i)', orden: 2 },
      { titulo: 'Bucle while',           contenidoTextual: 'Se ejecuta mientras una condicion sea verdadera.', orden: 3 },
      { titulo: 'Ejercicio practico',    contenidoTextual: 'Resuelve un ejercicio usando bucles.', orden: 4 },
    ],
  },
  {
    titulo: 'Funciones en Python',
    descripcion: 'Aprende a definir y reutilizar funciones.',
    orden: 3,
    pasos: [
      { titulo: 'Definir una funcion',   contenidoTextual: 'Usa def nombre(params): para crear una funcion.', orden: 1 },
      { titulo: 'Argumentos y return',   contenidoTextual: 'Las funciones pueden recibir argumentos y devolver valores con return.', orden: 2 },
    ],
  },
];

const ejerciciosData = [
  {
    titulo: 'Suma de dos numeros',
    descripcion: 'Lee dos numeros y muestra su suma.',
    dificultad: 'FACIL',
    lenguaje: 'python',
    tiempoEstimadoSeg: 300,
    moduloIdx: 0,
    casosPrueba: [
      { input: '2 3', outputEsperado: '5' },
      { input: '10 20', outputEsperado: '30' },
      { input: '-5 5', outputEsperado: '0' },
    ],
    solucionesCodigo: [
      'a, b = map(int, input().split())\nprint(a + b)',
      'nums = input().split()\nprint(int(nums[0]) + int(nums[1]))',
    ],
    recompensas: [
      { tipo: 'PUNTOS', probabilidad: '1.00', cantidad: 10 },
      { tipo: 'CARTA',  probabilidad: '1.00', cantidad: 1 },
    ],
  },
  {
    titulo: 'Imprimir del 1 al N',
    descripcion: 'Dado un entero N, imprime los numeros del 1 al N separados por espacios.',
    dificultad: 'FACIL',
    lenguaje: 'python',
    tiempoEstimadoSeg: 400,
    moduloIdx: 1,
    casosPrueba: [
      { input: '5', outputEsperado: '1 2 3 4 5' },
      { input: '1', outputEsperado: '1' },
      { input: '3', outputEsperado: '1 2 3' },
    ],
    solucionesCodigo: [
      'n = int(input())\nprint(*range(1, n+1))',
      'n = int(input())\nprint(" ".join(str(i) for i in range(1, n+1)))',
    ],
    recompensas: [
      { tipo: 'PUNTOS', probabilidad: '1.00', cantidad: 10 },
      { tipo: 'CARTA',  probabilidad: '1.00', cantidad: 1 },
    ],
  },
  {
    titulo: 'Factorial',
    descripcion: 'Calcula el factorial de un numero N.',
    dificultad: 'MEDIO',
    lenguaje: 'python',
    tiempoEstimadoSeg: 600,
    moduloIdx: 2,
    casosPrueba: [
      { input: '5', outputEsperado: '120' },
      { input: '0', outputEsperado: '1' },
      { input: '7', outputEsperado: '5040' },
    ],
    solucionesCodigo: [
      'def factorial(n):\n  if n <= 1: return 1\n  return n * factorial(n-1)\nprint(factorial(int(input())))',
      'n = int(input())\nresult = 1\nfor i in range(1, n+1):\n  result *= i\nprint(result)',
    ],
    recompensas: [
      { tipo: 'PUNTOS', probabilidad: '1.00', cantidad: 20 },
      { tipo: 'CARTA',  probabilidad: '1.00', cantidad: 1 },
    ],
  },
  {
    titulo: 'Es par o impar',
    descripcion: 'Lee un numero y muestra "par" o "impar".',
    dificultad: 'FACIL',
    lenguaje: 'python',
    tiempoEstimadoSeg: 300,
    moduloIdx: 0,
    casosPrueba: [
      { input: '4', outputEsperado: 'par' },
      { input: '7', outputEsperado: 'impar' },
      { input: '0', outputEsperado: 'par' },
    ],
    solucionesCodigo: [
      'n = int(input())\nprint("par" if n % 2 == 0 else "impar")',
    ],
    recompensas: [
      { tipo: 'PUNTOS', probabilidad: '1.00', cantidad: 10 },
    ],
  },
  {
    titulo: 'Suma de lista',
    descripcion: 'Lee una lista de numeros separados por espacios y muestra su suma.',
    dificultad: 'MEDIO',
    lenguaje: 'python',
    tiempoEstimadoSeg: 500,
    moduloIdx: 1,
    casosPrueba: [
      { input: '1 2 3 4 5', outputEsperado: '15' },
      { input: '10', outputEsperado: '10' },
      { input: '-1 -2 -3', outputEsperado: '-6' },
    ],
    solucionesCodigo: [
      'print(sum(map(int, input().split())))',
      'nums = [int(x) for x in input().split()]\nprint(sum(nums))',
    ],
    recompensas: [
      { tipo: 'PUNTOS', probabilidad: '1.00', cantidad: 15 },
      { tipo: 'CARTA',  probabilidad: '1.00', cantidad: 1 },
    ],
  },
];

async function main() {
  console.log('[seed] Limpiando datos previos...');
  // Order matters due to FKs
  await prisma.usuarioPaso.deleteMany();
  await prisma.usuarioCarta.deleteMany();
  await prisma.ejercicioResuelto.deleteMany();
  await prisma.ejercicioActivo.deleteMany();
  await prisma.recompensa.deleteMany();
  await prisma.ejercicio.deleteMany();
  await prisma.paso.deleteMany();
  await prisma.modulo.deleteMany();
  await prisma.cartaNivel.deleteMany();
  await prisma.carta.deleteMany();
  await prisma.habilidad.deleteMany();

  console.log('[seed] Habilidades...');
  const habilidades = [];
  for (const h of habilidadesData) {
    habilidades.push(await prisma.habilidad.create({ data: h }));
  }

  console.log('[seed] Cartas + niveles...');
  for (const c of cartasData) {
    const carta = await prisma.carta.create({
      data: {
        nombre: c.nombre,
        descripcion: c.descripcion,
        rareza: c.rareza,
        imagen: c.imagen,
        habilidadId: habilidades[c.habilidadIdx].id,
        niveles: {
          create: [
            { nivel: 1, dano: 10, salud: 50, mana: 20, danoHabilidad: 15 },
            { nivel: 2, dano: 15, salud: 70, mana: 30, danoHabilidad: 22 },
            { nivel: 3, dano: 22, salud: 100, mana: 45, danoHabilidad: 33 },
          ],
        },
      },
    });
    console.log(`  - carta: ${carta.nombre} (${c.rareza})`);
  }

  console.log('[seed] Modulos + pasos...');
  const modulos = [];
  for (const m of modulosData) {
    const modulo = await prisma.modulo.create({
      data: {
        titulo: m.titulo,
        descripcion: m.descripcion,
        orden: m.orden,
        pasos: {
          create: m.pasos.map((p) => ({
            titulo: p.titulo,
            contenidoTextual: p.contenidoTextual,
            orden: p.orden,
          })),
        },
      },
    });
    modulos.push(modulo);
    console.log(`  - modulo: ${modulo.titulo}`);
  }

  console.log('[seed] Ejercicios + recompensas...');
  for (const e of ejerciciosData) {
    const ejercicio = await prisma.ejercicio.create({
      data: {
        titulo: e.titulo,
        descripcion: e.descripcion,
        dificultad: e.dificultad,
        lenguaje: e.lenguaje,
        tiempoEstimadoSeg: e.tiempoEstimadoSeg,
        moduloId: modulos[e.moduloIdx]?.id ?? null,
        casosPrueba: e.casosPrueba,
        solucionesCodigo: e.solucionesCodigo,
        recompensas: {
          create: e.recompensas.map((r) => ({
            tipo: r.tipo,
            probabilidad: r.probabilidad,
            cantidad: r.cantidad,
          })),
        },
      },
    });
    console.log(`  - ejercicio: ${ejercicio.titulo} (${e.dificultad})`);
  }

  console.log('[seed] OK');
}

main()
  .catch((err) => {
    console.error('[seed] ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
