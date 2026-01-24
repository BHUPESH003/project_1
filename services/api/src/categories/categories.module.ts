import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryRegistry } from './handlers/category-registry';
import { PrintingCategoryHandler } from './handlers/printing/printing-category-handler';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoryRepository,
    CategoryRegistry,
    PrintingCategoryHandler,
    // Register handlers in registry
    {
      provide: 'CATEGORY_HANDLER_REGISTRATION',
      useFactory: (
        registry: CategoryRegistry,
        printingHandler: PrintingCategoryHandler,
      ) => {
        registry.register(printingHandler);
        return true;
      },
      inject: [CategoryRegistry, PrintingCategoryHandler],
    },
  ],
  exports: [CategoriesService, CategoryRegistry], // Export registry for use in OrdersService
})
export class CategoriesModule {}
