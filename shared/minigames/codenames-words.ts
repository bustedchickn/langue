import type { WordCard } from './codenames'
import { germanCards } from './codenames-german'
import { italianCards } from './codenames-italian'
import { portugueseCards } from './codenames-portuguese'
import { japaneseCards } from './codenames-japanese'
import { koreanCards } from './codenames-korean'
import { chineseCards } from './codenames-chinese'
import { russianCards } from './codenames-russian'

type BaseLanguage = 'English' | 'French' | 'Spanish'
const decks = {
  German: germanCards,
  Italian: italianCards,
  Portuguese: portugueseCards,
  Japanese: japaneseCards,
  Korean: koreanCards,
  Chinese: chineseCards,
  Russian: russianCards,
} satisfies Record<Exclude<keyof WordCard['words'], BaseLanguage>, Record<keyof typeof germanCards, readonly [string, string]>>

const baseCards = [
  {
    "id": "apple",
    "words": {
      "English": "Apple",
      "French": "Pomme",
      "Spanish": "Manzana"
    },
    "definitions": {
      "English": "A round fruit that grows on a tree.",
      "French": "Un fruit rond qui pousse sur un arbre.",
      "Spanish": "Una fruta redonda que crece en un árbol."
    }
  },
  {
    "id": "bird",
    "words": {
      "English": "Bird",
      "French": "Oiseau",
      "Spanish": "Pájaro"
    },
    "definitions": {
      "English": "An animal with feathers and wings.",
      "French": "Un animal avec des plumes et des ailes.",
      "Spanish": "Un animal con plumas y alas."
    }
  },
  {
    "id": "bridge",
    "words": {
      "English": "Bridge",
      "French": "Pont",
      "Spanish": "Puente"
    },
    "definitions": {
      "English": "A structure for crossing over water or a gap.",
      "French": "Une construction qui permet de traverser un cours d'eau ou un vide.",
      "Spanish": "Una construcción para cruzar agua o un espacio."
    }
  },
  {
    "id": "book",
    "words": {
      "English": "Book",
      "French": "Livre",
      "Spanish": "Libro"
    },
    "definitions": {
      "English": "A collection of pages you can read.",
      "French": "Un ensemble de pages à lire.",
      "Spanish": "Un conjunto de páginas para leer."
    }
  },
  {
    "id": "cloud",
    "words": {
      "English": "Cloud",
      "French": "Nuage",
      "Spanish": "Nube"
    },
    "definitions": {
      "English": "A mass of water droplets in the sky.",
      "French": "Une masse de gouttelettes d'eau dans le ciel.",
      "Spanish": "Una masa de gotas de agua en el cielo."
    }
  },
  {
    "id": "key",
    "words": {
      "English": "Key",
      "French": "Clé",
      "Spanish": "Llave"
    },
    "definitions": {
      "English": "A small object used to open a lock.",
      "French": "Un petit objet qui sert à ouvrir une serrure.",
      "Spanish": "Un objeto pequeño que sirve para abrir una cerradura."
    }
  },
  {
    "id": "moon",
    "words": {
      "English": "Moon",
      "French": "Lune",
      "Spanish": "Luna"
    },
    "definitions": {
      "English": "The natural satellite that travels around Earth.",
      "French": "Le satellite naturel qui tourne autour de la Terre.",
      "Spanish": "El satélite natural que gira alrededor de la Tierra."
    }
  },
  {
    "id": "tree",
    "words": {
      "English": "Tree",
      "French": "Arbre",
      "Spanish": "Árbol"
    },
    "definitions": {
      "English": "A tall plant with a trunk and branches.",
      "French": "Une grande plante avec un tronc et des branches.",
      "Spanish": "Una planta alta con tronco y ramas."
    }
  },
  {
    "id": "boat",
    "words": {
      "English": "Boat",
      "French": "Bateau",
      "Spanish": "Barco"
    },
    "definitions": {
      "English": "A vessel that travels on water.",
      "French": "Un véhicule qui se déplace sur l'eau.",
      "Spanish": "Una embarcación que viaja por el agua."
    }
  },
  {
    "id": "star",
    "words": {
      "English": "Star",
      "French": "Étoile",
      "Spanish": "Estrella"
    },
    "definitions": {
      "English": "A distant sun seen as a point of light.",
      "French": "Un soleil lointain visible comme un point lumineux.",
      "Spanish": "Un sol lejano que se ve como un punto de luz."
    }
  },
  {
    "id": "flower",
    "words": {
      "English": "Flower",
      "French": "Fleur",
      "Spanish": "Flor"
    },
    "definitions": {
      "English": "The colorful part of a plant.",
      "French": "La partie colorée d'une plante.",
      "Spanish": "La parte colorida de una planta."
    }
  },
  {
    "id": "clock",
    "words": {
      "English": "Clock",
      "French": "Horloge",
      "Spanish": "Reloj"
    },
    "definitions": {
      "English": "An object that shows the time.",
      "French": "Un objet qui indique l'heure.",
      "Spanish": "Un objeto que indica la hora."
    }
  },
  {
    "id": "fish",
    "words": {
      "English": "Fish",
      "French": "Poisson",
      "Spanish": "Pez"
    },
    "definitions": {
      "English": "An animal that lives and breathes in water.",
      "French": "Un animal qui vit et respire dans l'eau.",
      "Spanish": "Un animal que vive y respira en el agua."
    }
  },
  {
    "id": "window",
    "words": {
      "English": "Window",
      "French": "Fenêtre",
      "Spanish": "Ventana"
    },
    "definitions": {
      "English": "An opening in a wall that lets in light.",
      "French": "Une ouverture dans un mur qui laisse entrer la lumière.",
      "Spanish": "Una abertura en la pared que deja entrar la luz."
    }
  },
  {
    "id": "shoe",
    "words": {
      "English": "Shoe",
      "French": "Chaussure",
      "Spanish": "Zapato"
    },
    "definitions": {
      "English": "Something worn to protect a foot.",
      "French": "Un objet porté pour protéger le pied.",
      "Spanish": "Una prenda que protege el pie."
    }
  },
  {
    "id": "rain",
    "words": {
      "English": "Rain",
      "French": "Pluie",
      "Spanish": "Lluvia"
    },
    "definitions": {
      "English": "Drops of water falling from clouds.",
      "French": "Des gouttes d'eau qui tombent des nuages.",
      "Spanish": "Gotas de agua que caen de las nubes."
    }
  },
  {
    "id": "bread",
    "words": {
      "English": "Bread",
      "French": "Pain",
      "Spanish": "Pan"
    },
    "definitions": {
      "English": "Food baked from flour and water.",
      "French": "Un aliment cuit au four à base de farine et d'eau.",
      "Spanish": "Un alimento horneado hecho con harina y agua."
    }
  },
  {
    "id": "mountain",
    "words": {
      "English": "Mountain",
      "French": "Montagne",
      "Spanish": "Montaña"
    },
    "definitions": {
      "English": "A very high area of land.",
      "French": "Un relief naturel très élevé.",
      "Spanish": "Una elevación natural de gran altura."
    }
  },
  {
    "id": "house",
    "words": {
      "English": "House",
      "French": "Maison",
      "Spanish": "Casa"
    },
    "definitions": {
      "English": "A building where people live.",
      "French": "Un bâtiment où vivent des personnes.",
      "Spanish": "Un edificio donde vive la gente."
    }
  },
  {
    "id": "sun",
    "words": {
      "English": "Sun",
      "French": "Soleil",
      "Spanish": "Sol"
    },
    "definitions": {
      "English": "The star that gives Earth light and warmth.",
      "French": "L'étoile qui apporte lumière et chaleur à la Terre.",
      "Spanish": "La estrella que da luz y calor a la Tierra."
    }
  },
  {
    "id": "river",
    "words": {
      "English": "River",
      "French": "Rivière",
      "Spanish": "Río"
    },
    "definitions": {
      "English": "A natural stream of flowing water.",
      "French": "Un cours d'eau naturel.",
      "Spanish": "Una corriente natural de agua."
    }
  },
  {
    "id": "garden",
    "words": {
      "English": "Garden",
      "French": "Jardin",
      "Spanish": "Jardín"
    },
    "definitions": {
      "English": "A place where people grow plants.",
      "French": "Un endroit où l'on cultive des plantes.",
      "Spanish": "Un lugar donde se cultivan plantas."
    }
  },
  {
    "id": "chair",
    "words": {
      "English": "Chair",
      "French": "Chaise",
      "Spanish": "Silla"
    },
    "definitions": {
      "English": "A seat for one person.",
      "French": "Un siège pour une personne.",
      "Spanish": "Un asiento para una persona."
    }
  },
  {
    "id": "school",
    "words": {
      "English": "School",
      "French": "École",
      "Spanish": "Escuela"
    },
    "definitions": {
      "English": "A place where people go to learn.",
      "French": "Un lieu où l'on va apprendre.",
      "Spanish": "Un lugar donde se va a aprender."
    }
  },
  {
    "id": "forest",
    "words": {
      "English": "Forest",
      "French": "Forêt",
      "Spanish": "Bosque"
    },
    "definitions": {
      "English": "A large area covered with trees.",
      "French": "Une grande étendue couverte d'arbres.",
      "Spanish": "Una gran extensión cubierta de árboles."
    }
  },
  {
    "id": "beach",
    "words": {
      "English": "Beach",
      "French": "Plage",
      "Spanish": "Playa"
    },
    "definitions": {
      "English": "A sandy or pebbly shore beside water.",
      "French": "Un rivage de sable ou de galets.",
      "Spanish": "Una orilla de arena o piedras junto al agua."
    }
  },
  {
    "id": "bear",
    "words": {
      "English": "Bear",
      "French": "Ours",
      "Spanish": "Oso"
    },
    "definitions": {
      "English": "A large furry animal with strong paws.",
      "French": "Un grand animal poilu aux pattes puissantes.",
      "Spanish": "Un animal grande y peludo con patas fuertes."
    }
  },
  {
    "id": "train",
    "words": {
      "English": "Train",
      "French": "Train",
      "Spanish": "Tren"
    },
    "definitions": {
      "English": "Connected vehicles that travel on rails.",
      "French": "Des véhicules reliés qui roulent sur des rails.",
      "Spanish": "Vehículos unidos que circulan sobre rieles."
    }
  },
  {
    "id": "door",
    "words": {
      "English": "Door",
      "French": "Porte",
      "Spanish": "Puerta"
    },
    "definitions": {
      "English": "A movable panel used to enter a room.",
      "French": "Un panneau mobile qui permet d'entrer dans une pièce.",
      "Spanish": "Un panel móvil que permite entrar en una habitación."
    }
  },
  {
    "id": "ice",
    "words": {
      "English": "Ice",
      "French": "Glace",
      "Spanish": "Hielo"
    },
    "definitions": {
      "English": "Water that has frozen solid.",
      "French": "De l'eau gelée et solide.",
      "Spanish": "Agua congelada y sólida."
    }
  },
  {
    "id": "horse",
    "words": {
      "English": "Horse",
      "French": "Cheval",
      "Spanish": "Caballo"
    },
    "definitions": {
      "English": "A large animal people can ride.",
      "French": "Un grand animal que l'on peut monter.",
      "Spanish": "Un animal grande que se puede montar."
    }
  },
  {
    "id": "music",
    "words": {
      "English": "Music",
      "French": "Musique",
      "Spanish": "Música"
    },
    "definitions": {
      "English": "Sounds arranged in rhythm or melody.",
      "French": "Des sons organisés en rythme ou en mélodie.",
      "Spanish": "Sonidos organizados con ritmo o melodía."
    }
  },
  {
    "id": "ocean",
    "words": {
      "English": "Ocean",
      "French": "Océan",
      "Spanish": "Océano"
    },
    "definitions": {
      "English": "A vast area of salt water.",
      "French": "Une vaste étendue d'eau salée.",
      "Spanish": "Una gran extensión de agua salada."
    }
  },
  {
    "id": "light",
    "words": {
      "English": "Light",
      "French": "Lumière",
      "Spanish": "Luz"
    },
    "definitions": {
      "English": "What makes things visible to your eyes.",
      "French": "Ce qui permet aux yeux de voir les choses.",
      "Spanish": "Lo que permite que los ojos vean las cosas."
    }
  },
  {
    "id": "table",
    "words": {
      "English": "Table",
      "French": "Table",
      "Spanish": "Mesa"
    },
    "definitions": {
      "English": "Furniture with a flat top for eating or working.",
      "French": "Un meuble à plateau plat pour manger ou travailler.",
      "Spanish": "Un mueble de superficie plana para comer o trabajar."
    }
  },
  {
    "id": "snow",
    "words": {
      "English": "Snow",
      "French": "Neige",
      "Spanish": "Nieve"
    },
    "definitions": {
      "English": "White ice crystals falling in cold weather.",
      "French": "Des cristaux de glace blancs qui tombent par temps froid.",
      "Spanish": "Cristales blancos de hielo que caen cuando hace frío."
    }
  },
  {
    "id": "cat",
    "words": {
      "English": "Cat",
      "French": "Chat",
      "Spanish": "Gato"
    },
    "definitions": {
      "English": "A small animal that often lives as a pet.",
      "French": "Un petit animal souvent domestique.",
      "Spanish": "Un animal pequeño que suele vivir como mascota."
    }
  },
  {
    "id": "dog",
    "words": {
      "English": "Dog",
      "French": "Chien",
      "Spanish": "Perro"
    },
    "definitions": {
      "English": "A domestic animal known for barking.",
      "French": "Un animal domestique connu pour aboyer.",
      "Spanish": "Un animal doméstico que se caracteriza por ladrar."
    }
  },
  {
    "id": "butterfly",
    "words": {
      "English": "Butterfly",
      "French": "Papillon",
      "Spanish": "Mariposa"
    },
    "definitions": {
      "English": "An insect with four often colorful wings.",
      "French": "Un insecte aux quatre ailes souvent colorées.",
      "Spanish": "Un insecto con cuatro alas a menudo coloridas."
    }
  },
  {
    "id": "bee",
    "words": {
      "English": "Bee",
      "French": "Abeille",
      "Spanish": "Abeja"
    },
    "definitions": {
      "English": "An insect that collects nectar and makes honey.",
      "French": "Un insecte qui récolte le nectar et produit du miel.",
      "Spanish": "Un insecto que recoge néctar y produce miel."
    }
  },
  {
    "id": "turtle",
    "words": {
      "English": "Turtle",
      "French": "Tortue",
      "Spanish": "Tortuga"
    },
    "definitions": {
      "English": "An animal with a hard shell protecting its body.",
      "French": "Un animal dont le corps est protégé par une carapace.",
      "Spanish": "Un animal con un caparazón duro que protege su cuerpo."
    }
  },
  {
    "id": "fox",
    "words": {
      "English": "Fox",
      "French": "Renard",
      "Spanish": "Zorro"
    },
    "definitions": {
      "English": "A wild animal with a pointed face and bushy tail.",
      "French": "Un animal sauvage au museau pointu et à la queue touffue.",
      "Spanish": "Un animal salvaje de hocico puntiagudo y cola espesa."
    }
  },
  {
    "id": "rabbit",
    "words": {
      "English": "Rabbit",
      "French": "Lapin",
      "Spanish": "Conejo"
    },
    "definitions": {
      "English": "A small animal with long ears that hops.",
      "French": "Un petit animal aux longues oreilles qui saute.",
      "Spanish": "Un animal pequeño de orejas largas que salta."
    }
  },
  {
    "id": "whale",
    "words": {
      "English": "Whale",
      "French": "Baleine",
      "Spanish": "Ballena"
    },
    "definitions": {
      "English": "A very large mammal that lives in the sea.",
      "French": "Un très grand mammifère qui vit dans la mer.",
      "Spanish": "Un mamífero muy grande que vive en el mar."
    }
  },
  {
    "id": "frog",
    "words": {
      "English": "Frog",
      "French": "Grenouille",
      "Spanish": "Rana"
    },
    "definitions": {
      "English": "An amphibian that jumps and often lives near water.",
      "French": "Un amphibien qui saute et vit souvent près de l'eau.",
      "Spanish": "Un anfibio que salta y suele vivir cerca del agua."
    }
  },
  {
    "id": "elephant",
    "words": {
      "English": "Elephant",
      "French": "Éléphant",
      "Spanish": "Elefante"
    },
    "definitions": {
      "English": "A very large animal with a long trunk.",
      "French": "Un très grand animal avec une longue trompe.",
      "Spanish": "Un animal muy grande con una trompa larga."
    }
  },
  {
    "id": "lion",
    "words": {
      "English": "Lion",
      "French": "Lion",
      "Spanish": "León"
    },
    "definitions": {
      "English": "A large wild cat whose males often have a mane.",
      "French": "Un grand félin sauvage dont le mâle a souvent une crinière.",
      "Spanish": "Un gran felino salvaje cuyo macho suele tener melena."
    }
  },
  {
    "id": "duck",
    "words": {
      "English": "Duck",
      "French": "Canard",
      "Spanish": "Pato"
    },
    "definitions": {
      "English": "A water bird with a broad bill.",
      "French": "Un oiseau aquatique au bec large.",
      "Spanish": "Un ave acuática con pico ancho."
    }
  },
  {
    "id": "leaf",
    "words": {
      "English": "Leaf",
      "French": "Feuille",
      "Spanish": "Hoja"
    },
    "definitions": {
      "English": "A flat part of a plant that grows from a stem.",
      "French": "Une partie plate d'une plante qui pousse sur une tige.",
      "Spanish": "Una parte plana de una planta que crece en un tallo."
    }
  },
  {
    "id": "seed",
    "words": {
      "English": "Seed",
      "French": "Graine",
      "Spanish": "Semilla"
    },
    "definitions": {
      "English": "A small part of a plant that can grow into a new plant.",
      "French": "Une petite partie d'une plante qui peut en faire pousser une nouvelle.",
      "Spanish": "Una pequeña parte de una planta de la que puede crecer otra."
    }
  },
  {
    "id": "grass",
    "words": {
      "English": "Grass",
      "French": "Herbe",
      "Spanish": "Hierba"
    },
    "definitions": {
      "English": "A low green plant that often covers the ground.",
      "French": "Une plante verte et basse qui couvre souvent le sol.",
      "Spanish": "Una planta verde y baja que suele cubrir el suelo."
    }
  },
  {
    "id": "island",
    "words": {
      "English": "Island",
      "French": "Île",
      "Spanish": "Isla"
    },
    "definitions": {
      "English": "A piece of land surrounded by water.",
      "French": "Une étendue de terre entourée d'eau.",
      "Spanish": "Una extensión de tierra rodeada de agua."
    }
  },
  {
    "id": "lake",
    "words": {
      "English": "Lake",
      "French": "Lac",
      "Spanish": "Lago"
    },
    "definitions": {
      "English": "A large area of water surrounded by land.",
      "French": "Une grande étendue d'eau entourée de terre.",
      "Spanish": "Una gran extensión de agua rodeada de tierra."
    }
  },
  {
    "id": "desert",
    "words": {
      "English": "Desert",
      "French": "Désert",
      "Spanish": "Desierto"
    },
    "definitions": {
      "English": "A very dry area with little rainfall.",
      "French": "Une région très sèche où il pleut peu.",
      "Spanish": "Una región muy seca donde llueve poco."
    }
  },
  {
    "id": "stone",
    "words": {
      "English": "Stone",
      "French": "Pierre",
      "Spanish": "Piedra"
    },
    "definitions": {
      "English": "A hard piece of natural rock.",
      "French": "Un morceau dur de roche naturelle.",
      "Spanish": "Un trozo duro de roca natural."
    }
  },
  {
    "id": "sand",
    "words": {
      "English": "Sand",
      "French": "Sable",
      "Spanish": "Arena"
    },
    "definitions": {
      "English": "Tiny grains of rock found on beaches.",
      "French": "De petits grains de roche présents sur les plages.",
      "Spanish": "Pequeños granos de roca presentes en las playas."
    }
  },
  {
    "id": "fire",
    "words": {
      "English": "Fire",
      "French": "Feu",
      "Spanish": "Fuego"
    },
    "definitions": {
      "English": "Flames that produce heat and light.",
      "French": "Des flammes qui produisent de la chaleur et de la lumière.",
      "Spanish": "Llamas que producen calor y luz."
    }
  },
  {
    "id": "wind",
    "words": {
      "English": "Wind",
      "French": "Vent",
      "Spanish": "Viento"
    },
    "definitions": {
      "English": "Air moving outdoors.",
      "French": "De l'air qui se déplace dehors.",
      "Spanish": "Aire que se mueve al exterior."
    }
  },
  {
    "id": "thunder",
    "words": {
      "English": "Thunder",
      "French": "Tonnerre",
      "Spanish": "Trueno"
    },
    "definitions": {
      "English": "The loud sound heard during a storm.",
      "French": "Le bruit fort entendu pendant un orage.",
      "Spanish": "El sonido fuerte que se oye durante una tormenta."
    }
  },
  {
    "id": "rainbow",
    "words": {
      "English": "Rainbow",
      "French": "Arc-en-ciel",
      "Spanish": "Arcoíris"
    },
    "definitions": {
      "English": "A colorful arc sometimes seen after rain.",
      "French": "Un arc coloré parfois visible après la pluie.",
      "Spanish": "Un arco de colores que a veces aparece después de la lluvia."
    }
  },
  {
    "id": "car",
    "words": {
      "English": "Car",
      "French": "Voiture",
      "Spanish": "Coche"
    },
    "definitions": {
      "English": "A road vehicle that usually has four wheels.",
      "French": "Un véhicule routier qui a généralement quatre roues.",
      "Spanish": "Un vehículo de carretera que suele tener cuatro ruedas."
    }
  },
  {
    "id": "bicycle",
    "words": {
      "English": "Bicycle",
      "French": "Vélo",
      "Spanish": "Bicicleta"
    },
    "definitions": {
      "English": "A two-wheeled vehicle moved by pedals.",
      "French": "Un véhicule à deux roues qui avance grâce aux pédales.",
      "Spanish": "Un vehículo de dos ruedas que avanza con pedales."
    }
  },
  {
    "id": "airplane",
    "words": {
      "English": "Airplane",
      "French": "Avion",
      "Spanish": "Avión"
    },
    "definitions": {
      "English": "A vehicle with wings that flies.",
      "French": "Un véhicule à ailes qui vole.",
      "Spanish": "Un vehículo con alas que vuela."
    }
  },
  {
    "id": "bus",
    "words": {
      "English": "Bus",
      "French": "Bus",
      "Spanish": "Autobús"
    },
    "definitions": {
      "English": "A large vehicle that carries passengers on roads.",
      "French": "Un grand véhicule qui transporte des passagers sur la route.",
      "Spanish": "Un vehículo grande que transporta pasajeros por carretera."
    }
  },
  {
    "id": "road",
    "words": {
      "English": "Road",
      "French": "Route",
      "Spanish": "Carretera"
    },
    "definitions": {
      "English": "A path built for vehicles to travel on.",
      "French": "Une voie construite pour la circulation des véhicules.",
      "Spanish": "Una vía construida para que circulen vehículos."
    }
  },
  {
    "id": "map",
    "words": {
      "English": "Map",
      "French": "Carte",
      "Spanish": "Mapa"
    },
    "definitions": {
      "English": "A drawing showing places and routes.",
      "French": "Un dessin qui montre des lieux et des itinéraires.",
      "Spanish": "Un dibujo que muestra lugares y rutas."
    }
  },
  {
    "id": "compass",
    "words": {
      "English": "Compass",
      "French": "Boussole",
      "Spanish": "Brújula"
    },
    "definitions": {
      "English": "An instrument that shows directions.",
      "French": "Un instrument qui indique les directions.",
      "Spanish": "Un instrumento que indica las direcciones."
    }
  },
  {
    "id": "umbrella",
    "words": {
      "English": "Umbrella",
      "French": "Parapluie",
      "Spanish": "Paraguas"
    },
    "definitions": {
      "English": "A folding cover that protects you from rain.",
      "French": "Un accessoire pliant qui protège de la pluie.",
      "Spanish": "Un objeto plegable que protege de la lluvia."
    }
  },
  {
    "id": "hat",
    "words": {
      "English": "Hat",
      "French": "Chapeau",
      "Spanish": "Sombrero"
    },
    "definitions": {
      "English": "A covering worn on the head.",
      "French": "Un accessoire que l'on porte sur la tête.",
      "Spanish": "Una prenda que se lleva en la cabeza."
    }
  },
  {
    "id": "coat",
    "words": {
      "English": "Coat",
      "French": "Manteau",
      "Spanish": "Abrigo"
    },
    "definitions": {
      "English": "A warm outer garment.",
      "French": "Un vêtement chaud porté par-dessus les autres.",
      "Spanish": "Una prenda exterior que protege del frío."
    }
  },
  {
    "id": "shirt",
    "words": {
      "English": "Shirt",
      "French": "Chemise",
      "Spanish": "Camisa"
    },
    "definitions": {
      "English": "A garment worn on the upper body.",
      "French": "Un vêtement porté sur le haut du corps.",
      "Spanish": "Una prenda que se lleva en la parte superior del cuerpo."
    }
  },
  {
    "id": "pocket",
    "words": {
      "English": "Pocket",
      "French": "Poche",
      "Spanish": "Bolsillo"
    },
    "definitions": {
      "English": "A small fabric pouch sewn into clothing.",
      "French": "Une petite pochette cousue dans un vêtement.",
      "Spanish": "Una pequeña bolsa de tela cosida a una prenda."
    }
  },
  {
    "id": "bag",
    "words": {
      "English": "Bag",
      "French": "Sac",
      "Spanish": "Bolsa"
    },
    "definitions": {
      "English": "A container used to carry things.",
      "French": "Un contenant utilisé pour transporter des objets.",
      "Spanish": "Un recipiente que se usa para llevar cosas."
    }
  },
  {
    "id": "cup",
    "words": {
      "English": "Cup",
      "French": "Tasse",
      "Spanish": "Taza"
    },
    "definitions": {
      "English": "A small container used for drinking.",
      "French": "Un petit récipient utilisé pour boire.",
      "Spanish": "Un recipiente pequeño que se usa para beber."
    }
  },
  {
    "id": "plate",
    "words": {
      "English": "Plate",
      "French": "Assiette",
      "Spanish": "Plato"
    },
    "definitions": {
      "English": "A flat dish used for serving food.",
      "French": "Un récipient plat utilisé pour servir des aliments.",
      "Spanish": "Una pieza plana que se usa para servir comida."
    }
  },
  {
    "id": "spoon",
    "words": {
      "English": "Spoon",
      "French": "Cuillère",
      "Spanish": "Cuchara"
    },
    "definitions": {
      "English": "An eating utensil with a small bowl.",
      "French": "Un ustensile de table avec un petit creux.",
      "Spanish": "Un utensilio para comer con una parte cóncava."
    }
  },
  {
    "id": "knife",
    "words": {
      "English": "Knife",
      "French": "Couteau",
      "Spanish": "Cuchillo"
    },
    "definitions": {
      "English": "A tool with a blade used for cutting.",
      "French": "Un outil muni d'une lame qui sert à couper.",
      "Spanish": "Una herramienta con hoja que sirve para cortar."
    }
  },
  {
    "id": "bottle",
    "words": {
      "English": "Bottle",
      "French": "Bouteille",
      "Spanish": "Botella"
    },
    "definitions": {
      "English": "A container with a narrow neck for liquids.",
      "French": "Un récipient à col étroit pour les liquides.",
      "Spanish": "Un recipiente de cuello estrecho para líquidos."
    }
  },
  {
    "id": "cheese",
    "words": {
      "English": "Cheese",
      "French": "Fromage",
      "Spanish": "Queso"
    },
    "definitions": {
      "English": "A food made from milk.",
      "French": "Un aliment fabriqué à partir de lait.",
      "Spanish": "Un alimento elaborado con leche."
    }
  },
  {
    "id": "egg",
    "words": {
      "English": "Egg",
      "French": "Œuf",
      "Spanish": "Huevo"
    },
    "definitions": {
      "English": "An oval food laid by a bird.",
      "French": "Un aliment ovale pondu par un oiseau.",
      "Spanish": "Un alimento ovalado puesto por un ave."
    }
  },
  {
    "id": "milk",
    "words": {
      "English": "Milk",
      "French": "Lait",
      "Spanish": "Leche"
    },
    "definitions": {
      "English": "A white liquid produced by mammals.",
      "French": "Un liquide blanc produit par les mammifères.",
      "Spanish": "Un líquido blanco producido por mamíferos."
    }
  },
  {
    "id": "honey",
    "words": {
      "English": "Honey",
      "French": "Miel",
      "Spanish": "Miel"
    },
    "definitions": {
      "English": "A sweet substance made by bees.",
      "French": "Une substance sucrée produite par les abeilles.",
      "Spanish": "Una sustancia dulce producida por las abejas."
    }
  },
  {
    "id": "orange",
    "words": {
      "English": "Orange",
      "French": "Orange",
      "Spanish": "Naranja"
    },
    "definitions": {
      "English": "A round citrus fruit with a thick peel.",
      "French": "Un agrume rond à l'écorce épaisse.",
      "Spanish": "Una fruta cítrica redonda de cáscara gruesa."
    }
  },
  {
    "id": "lemon",
    "words": {
      "English": "Lemon",
      "French": "Citron",
      "Spanish": "Limón"
    },
    "definitions": {
      "English": "A sour yellow citrus fruit.",
      "French": "Un agrume jaune au goût acide.",
      "Spanish": "Una fruta cítrica amarilla y ácida."
    }
  },
  {
    "id": "grape",
    "words": {
      "English": "Grape",
      "French": "Raisin",
      "Spanish": "Uva"
    },
    "definitions": {
      "English": "A small fruit that grows in bunches.",
      "French": "Un petit fruit qui pousse en grappes.",
      "Spanish": "Una fruta pequeña que crece en racimos."
    }
  },
  {
    "id": "carrot",
    "words": {
      "English": "Carrot",
      "French": "Carotte",
      "Spanish": "Zanahoria"
    },
    "definitions": {
      "English": "A long orange root vegetable.",
      "French": "Un légume-racine long et orange.",
      "Spanish": "Una raíz comestible larga y anaranjada."
    }
  },
  {
    "id": "potato",
    "words": {
      "English": "Potato",
      "French": "Pomme de terre",
      "Spanish": "Patata"
    },
    "definitions": {
      "English": "A vegetable that grows underground.",
      "French": "Un légume qui pousse sous terre.",
      "Spanish": "Un vegetal que crece bajo tierra."
    }
  },
  {
    "id": "pencil",
    "words": {
      "English": "Pencil",
      "French": "Crayon",
      "Spanish": "Lápiz"
    },
    "definitions": {
      "English": "A tool for writing that can be erased.",
      "French": "Un instrument pour écrire dont on peut effacer les traits.",
      "Spanish": "Un instrumento para escribir cuyos trazos se pueden borrar."
    }
  },
  {
    "id": "paper",
    "words": {
      "English": "Paper",
      "French": "Papier",
      "Spanish": "Papel"
    },
    "definitions": {
      "English": "A thin material used for writing or drawing.",
      "French": "Un matériau fin utilisé pour écrire ou dessiner.",
      "Spanish": "Un material fino usado para escribir o dibujar."
    }
  },
  {
    "id": "letter",
    "words": {
      "English": "Letter",
      "French": "Lettre",
      "Spanish": "Carta"
    },
    "definitions": {
      "English": "A written message sent to someone.",
      "French": "Un message écrit envoyé à quelqu'un.",
      "Spanish": "Un mensaje escrito enviado a alguien."
    }
  },
  {
    "id": "picture",
    "words": {
      "English": "Picture",
      "French": "Image",
      "Spanish": "Imagen"
    },
    "definitions": {
      "English": "A drawing or photograph of something.",
      "French": "Un dessin ou une photographie de quelque chose.",
      "Spanish": "Un dibujo o una fotografía de algo."
    }
  },
  {
    "id": "camera",
    "words": {
      "English": "Camera",
      "French": "Appareil photo",
      "Spanish": "Cámara"
    },
    "definitions": {
      "English": "A device used to take photographs.",
      "French": "Un appareil utilisé pour prendre des photos.",
      "Spanish": "Un aparato que se usa para tomar fotografías."
    }
  },
  {
    "id": "phone",
    "words": {
      "English": "Phone",
      "French": "Téléphone",
      "Spanish": "Teléfono"
    },
    "definitions": {
      "English": "A device used to talk to someone far away.",
      "French": "Un appareil qui permet de parler à distance.",
      "Spanish": "Un aparato que permite hablar con alguien a distancia."
    }
  },
  {
    "id": "computer",
    "words": {
      "English": "Computer",
      "French": "Ordinateur",
      "Spanish": "Ordenador"
    },
    "definitions": {
      "English": "An electronic device used to process information.",
      "French": "Un appareil électronique qui traite des informations.",
      "Spanish": "Un dispositivo electrónico que procesa información."
    }
  },
  {
    "id": "lamp",
    "words": {
      "English": "Lamp",
      "French": "Lampe",
      "Spanish": "Lámpara"
    },
    "definitions": {
      "English": "A device that produces light.",
      "French": "Un appareil qui produit de la lumière.",
      "Spanish": "Un aparato que produce luz."
    }
  },
  {
    "id": "mirror",
    "words": {
      "English": "Mirror",
      "French": "Miroir",
      "Spanish": "Espejo"
    },
    "definitions": {
      "English": "A surface that reflects an image.",
      "French": "Une surface qui reflète une image.",
      "Spanish": "Una superficie que refleja una imagen."
    }
  },
  {
    "id": "bed",
    "words": {
      "English": "Bed",
      "French": "Lit",
      "Spanish": "Cama"
    },
    "definitions": {
      "English": "A piece of furniture used for sleeping.",
      "French": "Un meuble utilisé pour dormir.",
      "Spanish": "Un mueble que se usa para dormir."
    }
  },
  {
    "id": "blanket",
    "words": {
      "English": "Blanket",
      "French": "Couverture",
      "Spanish": "Manta"
    },
    "definitions": {
      "English": "A large piece of fabric used for warmth.",
      "French": "Un grand morceau de tissu qui tient chaud.",
      "Spanish": "Una pieza grande de tela que da calor."
    }
  },
  {
    "id": "pillow",
    "words": {
      "English": "Pillow",
      "French": "Oreiller",
      "Spanish": "Almohada"
    },
    "definitions": {
      "English": "A soft cushion used to support the head.",
      "French": "Un coussin doux qui soutient la tête.",
      "Spanish": "Un cojín blando que sostiene la cabeza."
    }
  },
  {
    "id": "family",
    "words": {
      "English": "Family",
      "French": "Famille",
      "Spanish": "Familia"
    },
    "definitions": {
      "English": "A group of people related to one another.",
      "French": "Un groupe de personnes liées entre elles.",
      "Spanish": "Un grupo de personas unidas por parentesco."
    }
  }
] satisfies (Omit<WordCard, 'id' | 'words' | 'definitions'> & {
  id: keyof typeof germanCards
  words: Pick<WordCard['words'], BaseLanguage>
  definitions: Pick<WordCard['definitions'], BaseLanguage>
})[]

export const wordCards: WordCard[] = baseCards.map(card => {
  const localized = (column: 0 | 1) => ({
    German: decks.German[card.id][column],
    Italian: decks.Italian[card.id][column],
    Portuguese: decks.Portuguese[card.id][column],
    Japanese: decks.Japanese[card.id][column],
    Korean: decks.Korean[card.id][column],
    Chinese: decks.Chinese[card.id][column],
    Russian: decks.Russian[card.id][column],
  })
  return { ...card, words: { ...card.words, ...localized(0) }, definitions: { ...card.definitions, ...localized(1) } }
})
