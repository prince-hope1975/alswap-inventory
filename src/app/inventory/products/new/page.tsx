import { ProductForm } from "./product-form";

export default function NewProductPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Add New Product
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Create a new product in your inventory.
                </p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
                <ProductForm />
            </div>
        </div>
    );
}
