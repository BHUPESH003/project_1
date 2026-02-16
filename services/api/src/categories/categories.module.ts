import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryRegistry } from './handlers/category-registry';
import { PrintingCategoryHandler } from './handlers/printing/printing-category-handler';
import { GenericCategoryHandler } from './handlers/generic/generic-category-handler';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoryRepository,
    CategoryRegistry,
    PrintingCategoryHandler,
    GenericCategoryHandler,
    // Register handlers in registry
    {
      provide: 'CATEGORY_HANDLER_REGISTRATION',
      useFactory: (
        registry: CategoryRegistry,
        printingHandler: PrintingCategoryHandler,
        genericHandler: GenericCategoryHandler,
      ) => {
        // Register generic handler first (fallback)
        registry.register(genericHandler);

        // Register specific handlers (take precedence)
        registry.register(printingHandler);

        return true;
      },
      inject: [
        CategoryRegistry,
        PrintingCategoryHandler,
        GenericCategoryHandler,
      ],
    },
  ],
  exports: [CategoriesService, CategoryRegistry], // Export registry for use in OrdersService
})
export class CategoriesModule {}
