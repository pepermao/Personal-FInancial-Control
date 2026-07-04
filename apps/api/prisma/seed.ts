import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const banks = await Promise.all(
    ['Nubank', 'Itaú', 'Caixa'].map((name) =>
      prisma.bank.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const bankByName = Object.fromEntries(banks.map((b) => [b.name, b]));

  const accountSpecs: Array<{ bank: string; name: string }> = [
    { bank: 'Nubank', name: 'Nubank PF' },
    { bank: 'Nubank', name: 'Nubank PJ' },
    { bank: 'Itaú', name: 'Itaú PF' },
    { bank: 'Caixa', name: 'Caixa PF' },
  ];
  for (const spec of accountSpecs) {
    const bank = bankByName[spec.bank];
    await prisma.account.upsert({
      where: { bankId_name: { bankId: bank.id, name: spec.name } },
      update: {},
      create: { bankId: bank.id, name: spec.name },
    });
  }

  const categoryNames = [
    'Alimentação',
    'Moradia',
    'Transporte',
    'Saúde',
    'Tecnologia',
    'Lazer',
    'Doações',
    'Receita PJ',
    'Impostos',
    'Investimentos',
    'Transferência Interna',
    'Reembolso',
  ];
  const categories: Record<string, { id: string; name: string }> = {};
  for (const name of categoryNames) {
    const existing = await prisma.category.findFirst({ where: { name, parentId: null } });
    categories[name] =
      existing ?? (await prisma.category.create({ data: { name } }));
  }

  const ruleSpecs: Array<{
    pattern: string;
    category: string;
    subcategory?: string;
    priority: number;
  }> = [
    { pattern: 'OURIBANK', category: 'Receita PJ', priority: 10 },
    { pattern: 'Aletheia', category: 'Doações', subcategory: 'AletheiaFact', priority: 10 },
    { pattern: 'Uber', category: 'Transporte', subcategory: 'Uber', priority: 10 },
    { pattern: 'MRV', category: 'Moradia', subcategory: 'Apartamento', priority: 10 },
    { pattern: 'OPEA', category: 'Moradia', subcategory: 'Apartamento', priority: 10 },
    { pattern: 'DAS-SIMPLES', category: 'Impostos', subcategory: 'DAS', priority: 10 },
    { pattern: 'RECEITA FED', category: 'Impostos', subcategory: 'DARF', priority: 10 },
    { pattern: 'OpenAI', category: 'Tecnologia', subcategory: 'ChatGPT', priority: 10 },
    { pattern: 'Claude', category: 'Tecnologia', subcategory: 'Claude', priority: 10 },
    { pattern: 'Netflix', category: 'Lazer', subcategory: 'Streaming', priority: 10 },
    { pattern: 'Disney', category: 'Lazer', subcategory: 'Streaming', priority: 10 },
  ];

  for (const rule of ruleSpecs) {
    const category = categories[rule.category];
    const existing = await prisma.classificationRule.findFirst({
      where: { pattern: rule.pattern },
    });
    if (existing) {
      await prisma.classificationRule.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          subcategory: rule.subcategory,
          priority: rule.priority,
        },
      });
    } else {
      await prisma.classificationRule.create({
        data: {
          pattern: rule.pattern,
          categoryId: category.id,
          subcategory: rule.subcategory,
          priority: rule.priority,
        },
      });
    }
  }

  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
