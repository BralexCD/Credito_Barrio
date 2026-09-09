import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Vehicle } from '../../../domain/model/vehicle.entity';
import { VehicleImageInput, VehicleStore } from '../../../application/vehicle.store';
import { CloudinaryService } from '../../../../shared/infrastructure/cloudinary.service';
import { IamStore } from '../../../../iam/application/iam.store';

type ImageFormGroup = FormGroup<{
  id: FormControl<string | null>;
  url: FormControl<string>;
  cloudinaryPublicId: FormControl<string | null>;
  isPrimary: FormControl<boolean>;
}>;

/**
 * Create/edit screen for a Vehicle, including its image gallery.
 * Route param `id` switches the form to edit mode.
 */
@Component({
  selector: 'app-vehicle-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  templateUrl: './vehicle-form.html',
  styleUrl: './vehicle-form.css',
})
export class VehicleForm {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly iamStore = inject(IamStore);

  protected readonly store = inject(VehicleStore);

  protected vehicleId: string | null = null;
  protected isEdit = false;

  protected readonly imageUploading = signal(false);
  protected readonly imageUploadError = signal<string | null>(null);

  readonly images = this.fb.array<ImageFormGroup>([]);

  readonly form = this.fb.nonNullable.group({
    brand: ['', Validators.required],
    model: ['', Validators.required],
    year: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(1990), Validators.max(2100)],
    ],
    color: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    currencyCatalogId: ['', Validators.required],
    stock: [0, [Validators.required, Validators.min(0)]],
    status: [true],
    images: this.images,
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.vehicleId = id;
      this.isEdit = true;

      const vehicle = this.store.getVehicleById(id)();

      if (vehicle) {
        this.form.patchValue({
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          price: vehicle.price,
          currencyCatalogId: vehicle.currencyCatalogId,
          stock: vehicle.stock,
          status: vehicle.status,
        });

        vehicle.images.forEach((image) =>
          this.images.push(
            this.buildImageGroup(image.url, image.isPrimary, image.id, image.cloudinaryPublicId),
          ),
        );
      }
    }

    if (this.images.length === 0) {
      this.images.push(this.buildImageGroup('', true));
    }
  }

  private buildImageGroup(
    url: string,
    isPrimary: boolean,
    id: string | null = null,
    cloudinaryPublicId: string | null = null,
  ): ImageFormGroup {
    return this.fb.group({
      id: new FormControl<string | null>(id),
      url: new FormControl(url, { nonNullable: true, validators: [Validators.required] }),
      cloudinaryPublicId: new FormControl<string | null>(cloudinaryPublicId),
      isPrimary: new FormControl(isPrimary, { nonNullable: true }),
    });
  }

  addImage(): void {
    this.images.push(this.buildImageGroup('', this.images.length === 0));
  }

  removeImage(index: number): void {
    const wasPrimary = this.images.at(index).controls.isPrimary.value;

    this.images.removeAt(index);

    if (wasPrimary && this.images.length > 0) {
      this.images.at(0).controls.isPrimary.setValue(true);
    }
  }

  setPrimary(index: number): void {
    this.images.controls.forEach((control, i) => {
      control.controls.isPrimary.setValue(i === index);
    });
  }

  async onImageFileSelected(index: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.imageUploadError.set('Selecciona un archivo de imagen válido.');
      input.value = '';
      return;
    }

    const maxSizeMb = 5;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      this.imageUploadError.set(`La imagen no debe superar ${maxSizeMb} MB.`);
      input.value = '';
      return;
    }

    try {
      this.imageUploading.set(true);
      this.imageUploadError.set(null);

      const result = await this.cloudinaryService.uploadImage(file);
      const imageGroup = this.images.at(index);

      imageGroup.controls.url.setValue(result.secureUrl);
      imageGroup.controls.cloudinaryPublicId.setValue(result.publicId);
      imageGroup.markAsDirty();
    } catch (error) {
      this.imageUploadError.set(
        error instanceof Error ? error.message : 'No se pudo subir la imagen.',
      );
    } finally {
      this.imageUploading.set(false);
      input.value = '';
    }
  }

  submit(): void {
    if (this.imageUploading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentUser = this.iamStore.currentUser();

    if (!currentUser) {
      return;
    }

    const value = this.form.getRawValue();
    const previous = this.vehicleId ? this.store.getVehicleById(this.vehicleId)() : undefined;

    const vehicle = new Vehicle({
      id: this.vehicleId ?? '',
      userId: previous?.userId ?? currentUser.id,
      brand: value.brand,
      model: value.model,
      year: value.year,
      color: value.color,
      price: value.price,
      currencyCatalogId: value.currencyCatalogId,
      stock: value.stock,
      status: value.status,
    });

    const imagesInput: VehicleImageInput[] = value.images
      .filter((image) => image.url && image.url.trim().length > 0)
      .map((image) => ({
        id: image.id ?? undefined,
        url: image.url.trim(),
        cloudinaryPublicId: image.cloudinaryPublicId ?? null,
        isPrimary: image.isPrimary,
      }));

    if (imagesInput.length > 0 && !imagesInput.some((image) => image.isPrimary)) {
      imagesInput[0].isPrimary = true;
    }

    if (this.isEdit) {
      this.store.updateVehicle(vehicle, imagesInput);
    } else {
      this.store.addVehicle(vehicle, imagesInput);
    }

    this.router.navigate(['/vehicles']);
  }
}
