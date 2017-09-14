# -*- coding: utf-8 -*-
# Generated by Django 1.11.5 on 2017-09-14 12:50
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scanners', '0013_auto_20170913_1305'),
    ]

    operations = [
        migrations.CreateModel(
            name='State',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scanner', models.CharField(max_length=255, unique=True)),
                ('value', models.CharField(max_length=255)),
                ('since', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
