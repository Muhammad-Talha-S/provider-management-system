from django.contrib import admin
from .models import Profile, ServiceRequest, Contract, Expert # <--- Import Expert

admin.site.register(Profile)
admin.site.register(ServiceRequest)
admin.site.register(Contract)
admin.site.register(Expert) # <--- Register it here