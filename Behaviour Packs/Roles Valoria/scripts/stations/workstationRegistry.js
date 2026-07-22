export const WORKSTATIONS = {
    "vroles:constructor_bench": {
        requiredTag: "constructor",
        title: "Constructor Bench",
        recipes: [
            {
                id: "stone_bricks",
                output: { typeId: "minecraft:stone_bricks", amount: 4 },
                inputs: [{ typeId: "minecraft:stone", amount: 4 }]
            }
        ]
    },

    "vroles:explorador_bench": {
        requiredTag: "explorador",
        title: "Explorador Bench",
        recipes: [
            {
                id: "compass",
                output: { typeId: "minecraft:compass", amount: 1 },
                inputs: [
                    { typeId: "minecraft:iron_ingot", amount: 4 },
                    { typeId: "minecraft:redstone", amount: 1 }
                ]
            }
        ]
    },

    "vroles:pescador_bench": {
        requiredTag: "pescador",
        title: "Pescador Bench",
        recipes: [
            {
                id: "fishing_rod",
                output: { typeId: "minecraft:fishing_rod", amount: 1 },
                inputs: [
                    { typeId: "minecraft:stick", amount: 3 },
                    { typeId: "minecraft:string", amount: 2 }
                ]
            }
        ]
    },

    "vroles:infernalista_bench": {
        requiredTag: "infernalista",
        title: "Infernalista Bench",
        recipes: [
            {
                id: "fire_charge",
                output: { typeId: "minecraft:fire_charge", amount: 1 },
                inputs: [
                    { typeId: "minecraft:gunpowder", amount: 1 },
                    { typeId: "minecraft:coal", amount: 1 },
                    { typeId: "minecraft:blaze_rod", amount: 1 }
                ]
            }
        ]
    },

    "vroles:granjero_bench": {
        requiredTag: "granjero",
        title: "Granjero Bench",
        recipes: [
            {
                id: "bread",
                output: { typeId: "minecraft:bread", amount: 1 },
                inputs: [{ typeId: "minecraft:wheat", amount: 3 }]
            }
        ]
    }
};
