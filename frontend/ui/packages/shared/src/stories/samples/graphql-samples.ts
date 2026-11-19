export const graphqlSample = `
type Query {
    fruit: Fruit
    pet(
        kind: String!

        "Flag that means that pet has wool"
        fluffy: Boolean = true
    ): Pet!
}

"""
Long
Fruuuuuuuuuuuuuuuuuuuuuuuuit
Description
""""
type Fruit {
    name: String!
}

type Pet {
    kind: String
    voice: String
    fluffy: Boolean
}
`

export const graphqlChangedSample = `
type Query {
    fruit: Fruit
    pet(
        kind: String!
    ): Pet!
}

"""
Long
Fruuuuuuuuuuuuuuuuuuuuuuuuit
Multi-line
Description
""""
type Fruit {
    name: String!
}

type Pet {
    kind: String
    voice: String
    isBig: Boolean
}
`
